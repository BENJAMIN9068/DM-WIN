// Aviator Spribe Synchronized Multiplayer SmartFox Protocol Bridge
(function () {
  'use strict';
  console.log('[*] Aviator Synchronized Client Engine initializing ...');

  const WALLET_KEY = 'dmfirst_game_wallet';

  function getWalletBalance() {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', '/api/game-wallet', false);
      xhr.send();
      const res = JSON.parse(xhr.responseText);
      if (res && typeof res.balance === 'number') {
        window.__gameBalance = res.balance;
        return res.balance;
      }
    } catch(e) {}
    try {
      const raw = localStorage.getItem(WALLET_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && typeof data.balance === 'number' && data.balance >= 0) {
          return data.balance;
        }
      }
    } catch(e) {}
    return window.__gameBalance || 1250;
  }

  function setWalletBalance(newBal) {
    try {
      newBal = Math.max(0, parseFloat(newBal.toFixed(2)));
      window.__gameBalance = newBal;
      let existing = {};
      try { existing = JSON.parse(localStorage.getItem(WALLET_KEY) || '{}'); } catch(e) {}
      existing.balance = newBal;
      existing.time = Date.now();
      localStorage.setItem(WALLET_KEY, JSON.stringify(existing));
      
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/game-wallet', true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(JSON.stringify({ balance: newBal, slug: 'aviator' }));
    } catch(e) {}
  }

  class AviatorMockSmartFox {
    constructor(config) {
      console.log('[*] AviatorMockSmartFox instantiated with config:', config);
      this.config = config;
      this.isConnected = false;
      this.isConnecting = false;
      this.debug = false;
      this._eventListeners = {};
      this.ws = null;
      this.reconnectTimer = null;
      this.activeBets = {};
      this.playerBalance = getWalletBalance();
      this.userName = "Player";
    }

    addEventListener(eventType, callback, scope) {
      if (!this._eventListeners[eventType]) {
        this._eventListeners[eventType] = [];
      }
      this._eventListeners[eventType].push({ callback, scope });
    }

    removeEventListener(eventType, callback) {
      if (!this._eventListeners[eventType]) return;
      this._eventListeners[eventType] = this._eventListeners[eventType].filter(
        item => item.callback !== callback
      );
    }

    dispatchEvent(eventType, eventData = {}) {
      const list = this._eventListeners[eventType];
      if (!list || list.length === 0) return;
      list.forEach(({ callback, scope }) => {
        try {
          callback.call(scope || this, eventData);
        } catch (err) {
          console.error(`[AviatorMockSmartFox error in ${eventType}]:`, err);
        }
      });
    }

    connect() {
      console.log('[*] Connecting to centralized Aviator WebSocket ...');
      this.isConnecting = true;

      const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = location.host || 'localhost:3000';
      const wsUrl = `${protocol}//${host}/aviator-ws`;

      try {
        if (this.ws) {
          try { this.ws.close(); } catch(e){}
        }

        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          console.log('[*] Connected to centralized game server at:', wsUrl);
          this.isConnecting = false;
          this.isConnected = true;
          this.dispatchEvent("connection", { success: true });
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "connection") {
              this.dispatchEvent("connection", { success: data.success });
            } else if (data.type === "login") {
              this.dispatchEvent("login", { user: data.user });
            } else if (data.type === "extensionResponse") {
              if (data.params && data.params.code === undefined) {
                data.params.code = 200;
              }

              // Update local wallet reference if server provides newBalance
              if (data.cmd === 'newBalance' && data.params && typeof data.params.newBalance === 'number') {
                this.playerBalance = data.params.newBalance;
                setWalletBalance(data.params.newBalance);
              }

              this.dispatchEvent("extensionResponse", {
                cmd: data.cmd,
                params: data.params
              });
            }
          } catch(err) {
            console.error('[Aviator WS Message Parse Error]:', err);
          }
        };

        this.ws.onclose = () => {
          console.warn('[*] Aviator WebSocket closed. Attempting reconnect ...');
          this.isConnected = false;
          this.isConnecting = false;
          this.dispatchEvent("connectionLost", { reason: "Server disconnected" });
          
          if (!this.reconnectTimer) {
            this.reconnectTimer = setTimeout(() => {
              this.reconnectTimer = null;
              this.connect();
            }, 1500);
          }
        };

        this.ws.onerror = (err) => {
          console.error('[*] WebSocket error:', err);
        };

      } catch(err) {
        console.error('[*] Error creating WebSocket:', err);
        this.isConnecting = false;
        this.isConnected = false;
        this.dispatchEvent("connection", { success: false, errorMessage: err.message });
      }
    }

    disconnect() {
      console.log('[*] AviatorMockSmartFox.disconnect() called');
      this.isConnected = false;
      if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      if (this.ws) {
        try { this.ws.close(); } catch(e){}
      }
      this.dispatchEvent("connectionLost", { reason: "Manual disconnect" });
    }

    send(request) {
      if (!request) return;

      // Handle Ping Request
      if (request._extCmd === 'PING_REQUEST' || request._extCmd === 'pingHandler') {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        } else {
          setTimeout(() => {
            this.dispatchEvent("extensionResponse", { cmd: "PING_RESPONSE", params: { code: 200 } });
          }, 50);
        }
        return;
      }

      // Handle Login Request
      const isLogin = (request._userName !== undefined) || (request.constructor && request.constructor.name === 'LoginRequest');
      if (isLogin) {
        const uParams = new URLSearchParams(window.location.search);
        const userId = uParams.get('user') || '9068839558';
        console.log('[*] Sending LoginRequest to centralized server for user:', userId);
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({
            type: "login",
            userName: request._userName || userId,
            userId: userId
          }));
        }
        return;
      }

      // Handle Extension Requests (bet, cashout, cancel, info, etc.)
      const extCmd = request._extCmd || '';
      const rawParams = request._params;
      let params = {};
      if (rawParams) {
        if (typeof rawParams.getKeysArray === 'function' && window.uX) {
          params = window.uX.toObject(rawParams);
        } else {
          params = rawParams;
        }
      }

      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: "extensionRequest",
          extCmd: extCmd,
          params: params
        }));
      } else {
        console.warn('[*] Cannot send request, WebSocket not open yet');
      }
    }
  }

  window.AviatorMockSmartFox = AviatorMockSmartFox;
  window.__createAviatorSmartFox = function (service, usModule) {
    console.log('[*] __createAviatorSmartFox factory invoked - Creating Synchronized WebSocket SmartFox Bridge!');
    return new AviatorMockSmartFox();
  };
})();
