
# Update the game wallet scripts to also use the server API
$slugs = @("chicken-road", "chicken-road-2", "aviator", "mega-block", "tower-dash")

$serverSyncAddition = @'
  // ── Server-side balance sync ──────────────────────────────────────────
  function syncToServer(balance, slug) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/game-wallet', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ balance: balance, slug: slug }));
    } catch(e) {}
  }

  function loadFromServer(slug) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/game-wallet', false); // sync
      xhr.send();
      var data = JSON.parse(xhr.responseText);
      if (data && typeof data.balance === 'number') {
        window.__gameBalance = data.balance;
        saveBalance(data.balance);
        return data.balance;
      }
    } catch(e) {}
    return readInitialBalance();
  }
'@

foreach ($slug in $slugs) {
    $gamePath = "archived_site/games/$slug/index.html"
    if (-not (Test-Path $gamePath)) { continue }
    
    $content = [System.IO.File]::ReadAllText((Resolve-Path $gamePath).Path, [System.Text.Encoding]::UTF8)
    
    # Check if server sync is already added
    if ($content.Contains('syncToServer')) {
        Write-Host "[SKIP] $slug - server sync already present"
        continue
    }
    
    # Find the saveBalance function to inject server sync after it
    $anchor = "  function saveBalance(newBal) {"
    $endAnchor = "  // Read balance on load"
    
    if ($content.Contains($endAnchor)) {
        $replacement = $serverSyncAddition + "`n  // Read balance on load"
        $newContent = $content.Replace($endAnchor, $replacement)
        
        # Also update the visibilitychange handler to call syncToServer
        $newContent = $newContent.Replace(
            "  document.addEventListener('visibilitychange', function() {`n    if (document.hidden) {`n      saveBalance(window.__gameBalance);`n    }`n  });`n`n  window.addEventListener('beforeunload', function() {`n    saveBalance(window.__gameBalance);`n  });`n`n  window.addEventListener('pagehide', function() {`n    saveBalance(window.__gameBalance);`n  });`n`n  // Read balance on load`n  readInitialBalance();",
            "  function persistBalance() {`n    saveBalance(window.__gameBalance);`n    syncToServer(window.__gameBalance, '$slug');`n  }`n`n  document.addEventListener('visibilitychange', function() {`n    if (document.hidden) { persistBalance(); }`n  });`n  window.addEventListener('beforeunload', persistBalance);`n  window.addEventListener('pagehide', persistBalance);`n`n  // Read balance on load (from server first, then localStorage)`n  loadFromServer('$slug');"
        )
        
        [System.IO.File]::WriteAllText((Resolve-Path $gamePath).Path, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "[OK] Server sync added to $slug"
    } else {
        Write-Host "[SKIP] $slug - anchor not found"
    }
}
