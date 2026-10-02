
# Inject wallet init script into each game's index.html
$WALLET_KEY = 'dmfirst_game_wallet'

$gameWalletScript = @"
<script id="__wallet_bridge__">
// ── Wallet Bridge: reads balance from parent app and syncs back ──────────
(function() {
  var WALLET_KEY = '$WALLET_KEY';

  // Exposed balance variable games can reference
  window.__gameBalance = 1250;
  window.__gameBalanceDeducted = 0;

  function readInitialBalance() {
    try {
      var raw = localStorage.getItem(WALLET_KEY);
      if (raw) {
        var data = JSON.parse(raw);
        if (data && typeof data.balance === 'number' && data.balance >= 0) {
          window.__gameBalance = data.balance;
          return data.balance;
        }
      }
    } catch (e) {}
    return 1250;
  }

  function saveBalance(newBal) {
    try {
      newBal = Math.max(0, parseFloat(newBal.toFixed(2)));
      window.__gameBalance = newBal;
      var existing = {};
      try { existing = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}'); } catch(e) {}
      existing.balance = newBal;
      existing.time = Date.now();
      localStorage.setItem(WALLET_KEY, JSON.stringify(existing));
    } catch (e) {}
  }

  // Read balance on load
  readInitialBalance();

  // Watch for visibility change - save latest balance when leaving
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      saveBalance(window.__gameBalance);
    }
  });

  window.addEventListener('beforeunload', function() {
    saveBalance(window.__gameBalance);
  });

  window.addEventListener('pagehide', function() {
    saveBalance(window.__gameBalance);
  });

  // ── Override fetch/XHR to intercept balance API responses ──────────────
  // This injects the real balance into any balance-check response the game makes
  var _origFetch = window.fetch;
  window.fetch = function(url, opts) {
    return _origFetch.apply(this, arguments).then(function(resp) {
      var u = (typeof url === 'string' ? url : (url && url.url)) || '';
      // Clone and patch balance in API responses
      if (u.match(/balance|wallet|user.?info|getBalance|getUser/i)) {
        var cloned = resp.clone();
        return cloned.json().then(function(data) {
          // Try to inject balance at common paths
          var patched = injectBalance(data, window.__gameBalance);
          return new Response(JSON.stringify(patched), {
            status: resp.status,
            statusText: resp.statusText,
            headers: resp.headers
          });
        }).catch(function() { return resp; });
      }
      return resp;
    });
  };

  var _origXHROpen = XMLHttpRequest.prototype.open;
  var _origXHRSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function(method, url) {
    this.__url = url;
    return _origXHROpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function() {
    var self = this;
    if (self.__url && String(self.__url).match(/balance|wallet|user.?info|getBalance|getUser/i)) {
      self.addEventListener('readystatechange', function() {
        if (self.readyState === 4) {
          try {
            var data = JSON.parse(self.responseText);
            var patched = injectBalance(data, window.__gameBalance);
            Object.defineProperty(self, 'responseText', { value: JSON.stringify(patched), writable: false });
            Object.defineProperty(self, 'response', { value: JSON.stringify(patched), writable: false });
          } catch (e) {}
        }
      });
    }
    return _origXHRSend.apply(this, arguments);
  };

  function injectBalance(data, bal) {
    if (!data || typeof data !== 'object') return data;
    // Common field names games use
    var fields = ['balance', 'Balance', 'amount', 'Amount', 'credits', 'Credits', 'wallet', 'Wallet', 'money', 'Money', 'cash'];
    function patchObj(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      for (var i = 0; i < fields.length; i++) {
        if (obj.hasOwnProperty(fields[i]) && typeof obj[fields[i]] === 'number') {
          obj[fields[i]] = bal;
        }
      }
      if (obj.data && typeof obj.data === 'object') patchObj(obj.data);
      if (obj.user && typeof obj.user === 'object') patchObj(obj.user);
      if (obj.result && typeof obj.result === 'object') patchObj(obj.result);
      return obj;
    }
    return patchObj(data);
  }

  // ── Expose API for games that use postMessage ──────────────────────────
  window.addEventListener('message', function(e) {
    try {
      var msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
      if (!msg) return;
      if (msg.type === 'GET_BALANCE' || msg.action === 'getBalance') {
        e.source && e.source.postMessage(JSON.stringify({
          type: 'BALANCE',
          balance: window.__gameBalance,
          amount: window.__gameBalance
        }), '*');
      }
      if (msg.type === 'SET_BALANCE' && typeof msg.balance === 'number') {
        saveBalance(msg.balance);
      }
    } catch (e2) {}
  });

})();
</script>
"@

$slugs = @("chicken-road", "chicken-road-2", "aviator", "mega-block", "tower-dash")

foreach ($slug in $slugs) {
    $gamePath = "archived_site/games/$slug/index.html"
    if (-not (Test-Path $gamePath)) {
        Write-Host "[SKIP] $slug - index.html not found"
        continue
    }
    $content = [System.IO.File]::ReadAllText((Resolve-Path $gamePath).Path, [System.Text.Encoding]::UTF8)
    
    # Check if already injected
    if ($content.Contains('__wallet_bridge__')) {
        Write-Host "[SKIP] $slug - already injected"
        continue
    }

    # Inject after <head> tag
    $headTag = '<head>'
    if ($content.Contains($headTag)) {
        $newContent = $content.Replace($headTag, $headTag + "`n" + $gameWalletScript)
        [System.IO.File]::WriteAllText((Resolve-Path $gamePath).Path, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "[OK] Wallet bridge injected into $slug"
    } elseif ($content.Contains('<head ')) {
        # head has attributes
        $idx = $content.IndexOf('<head ')
        $endIdx = $content.IndexOf('>', $idx) + 1
        $newContent = $content.Substring(0, $endIdx) + "`n" + $gameWalletScript + $content.Substring($endIdx)
        [System.IO.File]::WriteAllText((Resolve-Path $gamePath).Path, $newContent, [System.Text.Encoding]::UTF8)
        Write-Host "[OK] Wallet bridge injected into $slug (head with attrs)"
    } else {
        Write-Host "[FAIL] $slug - no <head> tag found"
    }
}
