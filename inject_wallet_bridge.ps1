
# Inject wallet bridge + game interceptor into index.html
$htmlPath = "archived_site/index.html"
$html = [System.IO.File]::ReadAllText((Resolve-Path $htmlPath).Path, [System.Text.Encoding]::UTF8)

# The injection point: right after the closing tag of the game hash interceptor script
$anchor = "</script>`n`t`t<link rel=`"icon`""

$walletBridgeScript = @'
</script>
		<script>
		// =========================================================
		// WALLET BRIDGE + FEATURED GAMES INTERCEPTOR
		// =========================================================
		(function() {
			'use strict';

			// ── 1. Wallet helpers ─────────────────────────────────
			var WALLET_KEY = 'dmfirst_game_wallet';

			function getMainBalance() {
				try {
					// Read from walletStore (primary source)
					var ws = localStorage.getItem('walletStore');
					if (ws) {
						var parsed = JSON.parse(ws);
						if (parsed && typeof parsed.amount === 'number') return parsed.amount;
					}
					// Fallback: userInfo
					var ui = localStorage.getItem('userInfo');
					if (ui) {
						var u = JSON.parse(ui);
						if (u && typeof u.amount === 'number') return u.amount;
					}
				} catch (e) {}
				return 1250;
			}

			function setMainBalance(newAmt) {
				newAmt = parseFloat(newAmt.toFixed(2));
				try {
					// Update walletStore
					var ws = localStorage.getItem('walletStore');
					var walletObj = ws ? JSON.parse(ws) : {};
					walletObj.amount = newAmt;
					localStorage.setItem('walletStore', JSON.stringify(walletObj));

					// Update userInfo
					var ui = localStorage.getItem('userInfo');
					var userObj = ui ? JSON.parse(ui) : {};
					userObj.amount = newAmt;
					localStorage.setItem('userInfo', JSON.stringify(userObj));

					// Broadcast so Vue reactivity picks it up
					window.dispatchEvent(new StorageEvent('storage', {
						key: 'walletStore',
						newValue: JSON.stringify(walletObj),
						storageArea: localStorage
					}));
				} catch (e) {}
			}

			function saveBalanceForGame(slug) {
				var bal = getMainBalance();
				localStorage.setItem(WALLET_KEY, JSON.stringify({ slug: slug, balance: bal, time: Date.now() }));
				return bal;
			}

			// ── 2. Sync balance back when user returns from a game ─
			function syncBalanceFromGame() {
				try {
					var raw = localStorage.getItem(WALLET_KEY);
					if (!raw) return;
					var data = JSON.parse(raw);
					// Only sync if the game wallet was touched within last 4 hours
					if (!data || Date.now() - data.time > 4 * 3600 * 1000) return;
					var gameBalance = parseFloat(data.balance);
					if (!isNaN(gameBalance) && gameBalance >= 0) {
						setMainBalance(gameBalance);
						// Notify UI to refresh balance display
						setTimeout(function() {
							var ev = new CustomEvent('balanceUpdated', { detail: { amount: gameBalance } });
							window.dispatchEvent(ev);
						}, 300);
					}
				} catch (e) {}
			}

			// When user comes back to main app tab from a game
			document.addEventListener('visibilitychange', function() {
				if (!document.hidden) {
					syncBalanceFromGame();
				}
			});
			window.addEventListener('focus', function() {
				syncBalanceFromGame();
			});
			window.addEventListener('pageshow', function(e) {
				if (e.persisted) syncBalanceFromGame();
			});

			// ── 3. Game map for navigation ──────────────────────────
			var GAME_MAP = {
				'chicken-road':  '/games/chicken-road/',
				'chicken-road-2':'/games/chicken-road-2/',
				'aviator':       '/games/aviator/',
				'mega-block':    '/games/mega-block/',
				'tower-dash':    '/games/tower-dash/'
			};

			function openGame(slug) {
				saveBalanceForGame(slug);
				var url = GAME_MAP[slug];
				if (url) window.location.href = url;
			}

			// ── 4. Homepage DOM interceptor ─────────────────────────
			// Intercept ALL clicks on the document, check if the target
			// is a game card for a featured/local game
			document.addEventListener('click', function(e) {
				var el = e.target;
				for (var i = 0; i < 10; i++) {
					if (!el || el === document.body) break;

					// Check data-game-code or gameCode attributes
					var gc = el.dataset && (el.dataset.gameCode || el.dataset.gamecode);
					if (!gc) {
						// Check parent click context text or class for known game names
						var text = el.textContent ? el.textContent.trim() : '';
					}

					if (gc && GAME_MAP[gc]) {
						e.preventDefault();
						e.stopImmediatePropagation();
						openGame(gc);
						return;
					}
					el = el.parentElement;
				}
			}, true);

			// ── 5. MutationObserver: patch game card links in DOM ───
			function patchGameCards(root) {
				// Selector covers common patterns the Vue app uses for game cards
				var cards = (root || document).querySelectorAll(
					'[class*="game-item"], [class*="gameItem"], [class*="game_item"], ' +
					'[class*="GameCard"], [class*="game-card"], [class*="game_card"]'
				);
				cards.forEach(function(card) {
					if (card._walletPatched) return;
					card._walletPatched = true;
					// Find game code from text content or img alt
					var nameEl = card.querySelector('[class*="name"], [class*="title"], img');
					if (!nameEl) return;
					var name = (nameEl.alt || nameEl.textContent || '').toLowerCase().trim();
					var slug = null;
					if (name.includes('chicken road 2') || name.includes('chicken-road-2')) slug = 'chicken-road-2';
					else if (name.includes('chicken road') || name.includes('chicken-road')) slug = 'chicken-road';
					else if (name.includes('aviator')) slug = 'aviator';
					else if (name.includes('mega block') || name.includes('mega-block')) slug = 'mega-block';
					else if (name.includes('tower dash') || name.includes('tower-dash')) slug = 'tower-dash';

					if (slug) {
						card.dataset.gameCode = slug;
						card.style.cursor = 'pointer';
					}
				});
			}

			// Observe DOM changes so we catch dynamically rendered cards
			var obs = new MutationObserver(function(mutations) {
				for (var i = 0; i < mutations.length; i++) {
					var m = mutations[i];
					for (var j = 0; j < m.addedNodes.length; j++) {
						var node = m.addedNodes[j];
						if (node.nodeType === 1) patchGameCards(node);
					}
				}
				patchGameCards(document.body);
			});
			obs.observe(document.documentElement, { childList: true, subtree: true });

			// Expose globally for game pages to call back
			window.__walletBridge = {
				getBalance: getMainBalance,
				setBalance: setMainBalance,
				openGame: openGame,
				WALLET_KEY: WALLET_KEY
			};

		})();
		</script>
		<link rel="icon"
'@

# Build the new HTML by replacing the anchor
if ($html.Contains($anchor)) {
    $newHtml = $html.Replace($anchor, $walletBridgeScript)
    [System.IO.File]::WriteAllText((Resolve-Path $htmlPath).Path, $newHtml, [System.Text.Encoding]::UTF8)
    Write-Host "[OK] Wallet bridge injected into index.html"
    Write-Host "New size: $($newHtml.Length) bytes (was $($html.Length))"
} else {
    Write-Host "[FAIL] Anchor not found. Trying alternative..."
    # Try with actual chars
    $alt = '</script>' + "`n" + "`t`t<link rel=`"icon`""
    if ($html.Contains($alt)) {
        $newHtml = $html.Replace($alt, ($walletBridgeScript -replace '<link rel="icon"', ''))
        [System.IO.File]::WriteAllText((Resolve-Path $htmlPath).Path, $newHtml, [System.Text.Encoding]::UTF8)
        Write-Host "[OK] Wallet bridge injected (alt method)"
    } else {
        Write-Host "[FAIL] No suitable injection point found"
        # Debug: show what's around position 986
        Write-Host "Context at anchor position:"
        Write-Host $html.Substring(980, 200)
    }
}
