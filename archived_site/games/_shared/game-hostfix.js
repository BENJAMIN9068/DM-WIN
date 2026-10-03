/* ───────────────────────────────────────────────────────────────────────────────
 * game-hostfix.js — shared runtime patch for the white-label provider games
 * (chicken-road, chicken-road-2, mega-block, tower-dash, aviator).
 *
 * Loaded as the FIRST script in each game's <head>, i.e. before any game bundle.
 *
 * Fixes two live-only failures that were leaving the games stuck on the
 * "Loading…" screen and showing a ₹0.00 wallet:
 *
 * 1. PROVIDER HOST RE-DERIVATION
 *    The provider client rewrites its absolute API/i18n endpoints onto the
 *    "base domain" of the page it is embedded in:
 *
 *        endpoint https://api.inout.games  +  page host dm-win-xxxx.centralindia-01.azurewebsites.net
 *          ->  https://api.centralindia-01.azurewebsites.net   (NXDOMAIN)
 *
 *    On localhost the provider's own guard returns the URL untouched (which is
 *    why it works locally), and on an *.inout.games host the rewrite is a no-op.
 *    On the Azure host it produces a host that does not resolve, the /api/auth
 *    call fails, and the React tree never mounts — the loading screen stays.
 *
 *    Two independent guards are installed:
 *      a) the webpack module registry is scanned on every chunk push and the
 *         host-rewrite function itself is replaced (exact fix);
 *      b) XHR.open / fetch / WebSocket are wrapped as a safety net that restores
 *         any *.centralindia-01.azurewebsites.net provider host. The WebSocket
 *         guard matters as much as the HTTP one: the client opens its realtime
 *         session on wss://api.<base>/io/…, and a broken socket keeps the game
 *         on the loading screen even after /api/auth has succeeded.
 *
 * 2. WALLET SYNC WITHOUT AUTH
 *    Every game's wallet bridge calls /api/game-wallet with a raw XHR that never
 *    carries the session token, so the server answers 401, the bridge silently
 *    falls back to a cached/zero balance and the in-game wallet reads 0.00.
 *    XHR.open is wrapped so the Authorization header (read from the same
 *    localStorage key the main app writes) is attached to every wallet call.
 * ─────────────────────────────────────────────────────────────────────────────── */
(function () {
  'use strict';
  if (window.__GAME_HOSTFIX__) return;
  window.__GAME_HOSTFIX__ = true;

  var PROVIDER_SUFFIX = 'inout.games';
  var AZURE_SUFFIX = 'centralindia-01.azurewebsites.net';
  // Hosts that must never be rewritten — the provider's real, resolvable hosts.
  var KEEP_HOSTS = /^(api|i18n|game-api|game-api-v2|static|assets|sentry|ws|socket)\.inoutgames?\.(dev|games)$/i;

  function readToken() {
    try {
      var t = localStorage.getItem('token') || localStorage.getItem('userToken') ||
              localStorage.getItem('accessToken');
      if (t) return t;
      // The platform appends its session token to the game URL; accept it when
      // localStorage is empty so the in-game wallet can still authenticate.
      var q = new URLSearchParams(location.search);
      return q.get('token') || q.get('auth_token') || q.get('authToken') || '';
    } catch (e) { return ''; }
  }

  function withToken(url) {
    if (!url || typeof url !== 'string') return url;
    if (!/\/api\/game-wallet(?:\?|$)/.test(url)) return url;
    if (/[?&](token|auth_token)=/.test(url)) return url;
    var t = readToken();
    if (!t) return url;
    try {
      var abs = new URL(url, location.href);
      abs.searchParams.set('token', t);
      return /^https?:/i.test(url) ? abs.toString() : abs.pathname + abs.search + abs.hash;
    } catch (e) { return url; }
  }

  /* Restore a provider host that the game's own base-domain rewrite mangled. */
  function fixProviderHost(u) {
    if (typeof u !== 'string' || u.indexOf(AZURE_SUFFIX) === -1) return u;
    var fixed = u.replace(
      /\/\/([a-z0-9-]+)\.centralindia-01\.azurewebsites\.net/gi,
      function (all, label) {
        var l = String(label).toLowerCase();
        if (l === 'api') return '//api.' + PROVIDER_SUFFIX;
        if (l === 'i18n') return '//i18n.' + PROVIDER_SUFFIX;
        if (l === 'game-api' || l === 'game-api-v2' || l === 'ws' || l === 'socket') {
          return '//game-api-v2.' + PROVIDER_SUFFIX;
        }
        return all;
      }
    );
    return fixed;
  }

  /* ── Guard (a): replace the webpack host-rewrite function in place ─────────── */
  function patchModule(mod) {
    if (!mod || typeof mod !== 'function') return;
    var fn = mod.k;
    if (typeof fn !== 'function' || fn.__hostfix) return;
    var patched = function (url) {
      try {
        if (typeof url === 'string' && url) {
          // Keep the provider's own hosts verbatim: the base-domain rewrite only
          // makes sense when the page is inout.games, which it is not here.
          var abs = new URL(url, location.href);
          if (KEEP_HOSTS.test(abs.hostname)) return String(url).replace(/\/$/, '');
        }
      } catch (e) {}
      var out = fn.apply(this, arguments);
      return typeof out === 'string' ? fixProviderHost(out) : out;
    };
    patched.__hostfix = true;
    try { mod.k = patched; } catch (e) {}
  }

  function scanRegistry(reg) {
    if (!reg || typeof reg !== 'object') return;
    try {
      for (var id in reg) {
        if (!Object.prototype.hasOwnProperty.call(reg, id)) continue;
        patchModule(reg[id]);
      }
    } catch (e) {}
  }

  function hookChunks() {
    var key = null;
    for (var k in window) {
      if (typeof k === 'string' && /^webpackChunk/.test(k) && Array.isArray(window[k])) { key = k; break; }
    }
    if (!key) return false;
    var arr = window[key];
    arr.forEach(function (entry) { scanRegistry(entry && entry[1]); });
    var push = arr.push;
    if (push.__hostfix) return true;
    var wrapped = function () {
      try {
        for (var i = 0; i < arguments.length; i++) scanRegistry(arguments[i] && arguments[i][1]);
      } catch (e) {}
      return push.apply(arr, arguments);
    };
    wrapped.__hostfix = true;
    arr.push = wrapped;
    return true;
  }

  /* ── Guard (b): transport-level safety net + wallet auth ──────────────────── */
  var OrigXHR = window.XMLHttpRequest;
  if (OrigXHR && OrigXHR.prototype && OrigXHR.prototype.open) {
    var origOpen = OrigXHR.prototype.open;
    var origSetHeader = OrigXHR.prototype.setRequestHeader;
    var origSend = OrigXHR.prototype.send;
    OrigXHR.prototype.open = function (method, url) {
      this.__hostfixUrl = url;
      arguments[1] = fixProviderHost(url);
      return origOpen.apply(this, arguments);
    };
    OrigXHR.prototype.setRequestHeader = function (name, value) {
      try {
        if (String(name).toLowerCase() === 'authorization') this.__hostfixAuth = true;
      } catch (e) {}
      return origSetHeader.apply(this, arguments);
    };
    OrigXHR.prototype.send = function () {
      try {
        var url = this.__hostfixUrl || '';
        if (/\/api\/game-wallet/.test(String(url)) && !this.__hostfixAuth) {
          var t = readToken();
          if (t) origSetHeader.call(this, 'Authorization', 'Bearer ' + t);
        }
      } catch (e) {}
      return origSend.apply(this, arguments);
    };
  }

  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function (input, init) {
      try {
        if (typeof input === 'string') {
          input = fixProviderHost(input);
        } else if (input && input.url && typeof input.url === 'string') {
          var fixed = fixProviderHost(input.url);
          if (fixed !== input.url) input = new Request(fixed, input);
        }
      } catch (e) {}
      return origFetch.call(this, input, init);
    };
  }

  /* ── Guard (c): WebSocket transport ──────────────────────────────────────────
   * The game holds its realtime session over wss://api.inout.games/io/…, which
   * the client re-derives as wss://api.centralindia-01.azurewebsites.net/io/…
   * That host does not resolve, the handshake dies with ERR_SSL_PROTOCOL_ERROR
   * (or hangs), and the client treats the missing socket as "not connected yet"
   * — so the loading screen never clears even when /api/auth succeeded.
   * The socket must be pointed back at the provider host, exactly like XHR/fetch.
   * ─────────────────────────────────────────────────────────────────────────── */
  var OrigWS = window.WebSocket;
  if (typeof OrigWS === 'function') {
    var PatchedWS = function (url, protocols) {
      var fixed = url;
      try { fixed = fixProviderHost(typeof url === 'string' ? url : String(url)); } catch (e) {}
      if (fixed !== url) {
        try { window.__hostfixWS = (window.__hostfixWS || []).concat([String(url) + ' -> ' + fixed]); } catch (e) {}
        return protocols === undefined ? new OrigWS(fixed) : new OrigWS(fixed, protocols);
      }
      return protocols === undefined ? new OrigWS(url) : new OrigWS(url, protocols);
    };
    // Keep constructor semantics and instanceof usable for the game code.
    PatchedWS.prototype = OrigWS.prototype;
    try {
      ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'].forEach(function (k) {
        if (k in OrigWS) PatchedWS[k] = OrigWS[k];
      });
    } catch (e) {}
    try { window.WebSocket = PatchedWS; } catch (e) {}
  }

  hookChunks();
  var tries = 0;
  var timer = setInterval(function () {
    tries++;
    if (hookChunks() || tries > 400) clearInterval(timer);
  }, 5);
})();
