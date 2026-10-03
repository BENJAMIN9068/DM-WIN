import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer } from 'ws';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AviatorServerEngine } from './aviator_server_engine.mjs';

// ── admin_backend loaded RE-EVALUATED here. ─────────────────────────────────
// `admin_backend.mjs` is imported dynamically so that if it ever throws during
// evaluation (e.g. a Node-version/ESM edge case on the Azure runtime) the server
// does NOT crash on boot (which previously surfaced as a 503 + "token expired"/
// login-redirect on every request). Each handler falls back to a safe no-op so
// the rest of the stack (auth, game wallet, WinGo) keeps serving.
let adminBackend = null;
const noop = (req, res) => { res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ code: 404, result: false, msg: 'Admin backend not available' })); };
async function loadAdminBackend() {
  if (adminBackend) return adminBackend;
  try {
    adminBackend = await import('./admin_backend.mjs');
  } catch (e) {
    console.error('[BOOT] Failed to load admin_backend.mjs:', e.message);
    adminBackend = {};
  }
  // Populate every named binding used elsewhere in this module. If the module
  // failed to load, fall back to safe no-ops so the core stack never crashes.
  const ab = adminBackend;
  handleAdminAuth           = ab.handleAdminAuth             || noop;
  handleAdminDashboard      = ab.handleAdminDashboard          || noop;
  handleAdminGames            = ab.handleAdminGames             || noop;
  handleAdminHackBots         = ab.handleAdminHackBots          || noop;
  handleAdminRecharges        = ab.handleAdminRecharges         || noop;
  handleAdminWithdrawals      = ab.handleAdminWithdrawals       || noop;
  handleAdminUsers            = ab.handleAdminUsers             || noop;
  handleAdminAudit            = ab.handleAdminAudit             || noop;
  handleAdminGateways         = ab.handleAdminGateways          || noop;
  verifyAdminAuth             = ab.verifyAdminAuth              || (() => null);
  setWalletStore              = ab.setWalletStore               || (() => {});
  adminDiag                   = ab.adminDiag                    || null;
  logAudit                    = ab.logAudit                     || (() => {});
  getUnifiedLiveResultForIssue = ab.getUnifiedLiveResultForIssue || (() => null);
  getGameConfigByTypeId       = ab.getGameConfigByTypeId        || (() => null);
  return adminBackend;
}
// Named bindings used throughout this module. Populated by loadAdminBackend() below.
let handleAdminAuth, handleAdminDashboard, handleAdminGames, handleAdminHackBots,
    handleAdminRecharges, handleAdminWithdrawals, handleAdminUsers, handleAdminAudit,
    handleAdminGateways, verifyAdminAuth, setWalletStore, logAudit, adminDiag,
    getUnifiedLiveResultForIssue, getGameConfigByTypeId;
// Eagerly load at startup (ESM top-level await). Now that the let bindings above
// are declared, this safely populates them. A bad admin_backend can never crash
// boot (-> 503) because loadAdminBackend() catches and no-ops.
await loadAdminBackend();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Minimal, dependency-free .env loader so `node serve.mjs` works locally without
// exporting every variable by hand. Existing process.env values always win.
(function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq <= 0) continue;
      const key = line.slice(0, eq).trim();
      let value = line.slice(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key && process.env[key] === undefined) process.env[key] = value;
    }
  } catch (e) {
    console.warn('[ENV] Could not read .env:', e.message);
  }
})();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'archived_site');
const GATEWAYS_FILE = path.join(__dirname, 'local_gateways.json');
const RECHARGES_FILE = path.join(__dirname, 'local_recharges.json');
const ALL_GAMES_FILE = path.join(__dirname, 'all_games_dmfirst1.json');
const SLOTS_CHILD_FILE = path.join(__dirname, 'slots_with_child_dmfirst1.json');
const VIDEO_CHILD_FILE = path.join(__dirname, 'video_with_child_dmfirst1.json');
const CATEGORIES_FILE = path.join(__dirname, 'game_categories_dmfirst1.json');

// Soft cap on a single /api/game-wallet balance-sync (the provider iframes report
// an absolute balance, so a one-shot mint must be bounded; see B3/wallet sync).
// Wins above this in a single sync are clamped — a real anti-fraud model needs
// provider-signed result webhooks, which these white-label iframes don't expose.
const MAX_WALLET_SYNC_INCREASE = 100000;

const OFFICIAL_ALL_GAMES = fs.existsSync(ALL_GAMES_FILE) ? JSON.parse(fs.readFileSync(ALL_GAMES_FILE, 'utf-8')) : null;
const OFFICIAL_SLOTS_CHILD = fs.existsSync(SLOTS_CHILD_FILE) ? JSON.parse(fs.readFileSync(SLOTS_CHILD_FILE, 'utf-8')) : null;
const OFFICIAL_VIDEO_CHILD = fs.existsSync(VIDEO_CHILD_FILE) ? JSON.parse(fs.readFileSync(VIDEO_CHILD_FILE, 'utf-8')) : null;
const OFFICIAL_CATEGORIES = fs.existsSync(CATEGORIES_FILE) ? JSON.parse(fs.readFileSync(CATEGORIES_FILE, 'utf-8')) : null;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf'
};

// ── MongoDB Database Connection & Schemas ─────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || '';
const JWT_SECRET = process.env.JWT_SECRET || '';
const ALLOWED_ORIGINS = (process.env.FRONTEND_ORIGIN || '').split(',').map(origin => origin.trim()).filter(Boolean);
let isMongoConnected = false;
let MongoUser = null;
let MongoBet = null;
let MongoRecharge = null;

// Authentication state is MongoDB-backed.  This process-local map is only a
// cache populated from MongoDB after a successful connection; it is never a
// filesystem or demo-auth fallback.
let users = {};

function saveUsers() {
  if (isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
    const operations = Object.values(users)
      .filter(user => user?.userId)
      .map(({ _id, ...user }) => ({
        updateOne: { filter: { userId: user.userId }, update: { $set: user }, upsert: true }
      }));
    if (operations.length) MongoUser.bulkWrite(operations, { ordered: false })
      .catch(err => console.error('[DB] saveUsers bulkWrite failed:', err.message));
  }
}

// ── Bet Store ──────────────────────────────────────────────────────────────────
let betStore = [];

function saveBets() {
  if (isMongoConnected && MongoBet && mongoose.connection.readyState === 1) {
    const operations = betStore
      .filter(bet => bet?.orderNumber)
      .map(({ _id, ...bet }) => ({
        updateOne: { filter: { orderNumber: bet.orderNumber }, update: { $set: bet }, upsert: true }
      }));
    if (operations.length) MongoBet.bulkWrite(operations, { ordered: false })
      .catch(err => console.error('[DB] saveBets bulkWrite failed:', err.message));
  }
}

// ── Admin wallet store (injected into admin_backend so it reads/writes the same
// MongoDB-backed wallet the game engine serves) ─────────────────────────────────
function findUserById(idOrNumber) {
  if (idOrNumber === undefined || idOrNumber === null) return null;
  const s = String(idOrNumber);
  return Object.values(users).find(u => u && (String(u.userId) === s || String(u.number) === s)) || null;
}

// Reconcile a user's balance with MongoDB (the source of truth shared across
// every app instance). Credits (recharge-accept, WinGo wins, admin set-balance)
// write to Mongo; if this instance's in-memory copy did not receive the write
// (multi-instance load balancing), a read must not trust its stale cache.
// Call this before returning any balance to the client.
async function refreshAmountFromDb(user) {
  if (!user || user.userId === undefined || user.userId === null) return;
  if (isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
    try {
      const doc = await MongoUser.findOne({ userId: user.userId }, { amount: 1 }).lean();
      if (doc && typeof doc.amount === 'number' && Number.isFinite(doc.amount)) {
        user.amount = doc.amount;
      }
    } catch (e) { /* transient DB error: keep the in-memory value */ }
  }
}

async function creditUserByUserId(userId, amount) {
  let user = findUserById(userId);
  // Mongo fallback: credit must work even if this instance's in-memory map has
  // not seen this user since boot (multi-instance / late hydration).
  if (!user && isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
    try {
      const doc = await MongoUser.findOne({ userId: Number(userId) }).lean();
      if (doc) { user = doc; if (doc.number) users[doc.number] = doc; }
    } catch (e) {}
  }
  if (!user) return null;
  const amt = Number(amount) || 0;
  if (isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
    await MongoUser.updateOne({ userId: user.userId }, { $inc: { amount: amt } });
  }
  user.amount = parseFloat(((user.amount || 0) + amt).toFixed(2));
  saveUsers();
  return user;
}

async function setUserBalance(userId, amount) {
  const user = findUserById(userId);
  if (!user) return null;
  const previousBalance = user.amount || 0;
  user.amount = +amount;
  if (isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
    await MongoUser.updateOne({ userId: user.userId }, { $set: { amount: user.amount } });
  }
  saveUsers();
  user._previousBalance = previousBalance;
  return user;
}

async function setUserBanned(userId, isBanned) {
  const user = findUserById(userId);
  if (!user) return null;
  user.isBanned = !!isBanned;
  if (isBanned) user.isOnline = false;
  if (isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
    await MongoUser.updateOne({ userId: user.userId }, { $set: { isBanned: !!isBanned, isOnline: user.isOnline } });
  }
  saveUsers();
  return user;
}

function persistRecharge(rec) {
  if (isMongoConnected && MongoRecharge && mongoose.connection.readyState === 1) {
    return MongoRecharge.updateOne({ id: rec.id }, { $set: rec }, { upsert: true });
  }
  return Promise.resolve();
}

setWalletStore({
  getUsersMap: () => users,
  findUser: findUserById,
  creditUserByUserId,
  setUserBalance,
  setUserBanned,
  persistRecharge
});

// Confine a URL-decoded path inside PUBLIC_DIR. `path.join` alone escapes on
// Windows when the request path contains `..%5c` (backslash), because WHATWG URL
// normalisation strips `/..` segments but leaves `%5c` for decodeURI to turn into
// a separator. Resolving and re-checking the prefix closes that hole.
function safeStaticPath(reqPath) {
  const resolved = path.resolve(PUBLIC_DIR, '.' + reqPath);
  if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) {
    return null;
  }
  return resolved;
}

async function connectDatabase() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI environment variable is missing');
  if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is missing');

  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  isMongoConnected = true;
  console.log('[DB] MongoDB connected');

  MongoUser = mongoose.model('User', new mongoose.Schema({
    userId: { type: Number, unique: true, index: true },
    number: { type: String, unique: true, sparse: true, index: true },
    username: { type: String, unique: true, sparse: true, index: true },
    password: { type: String, required: true },
    amount: { type: Number, default: 0 }
  }, { strict: false }));
  MongoBet = mongoose.model('Bet', new mongoose.Schema({ orderNumber: { type: String, unique: true }, userId: Number, amount: Number, profitAmount: Number, state: Number }, { strict: false }));
  MongoRecharge = mongoose.model('Recharge', new mongoose.Schema({ id: { type: String, unique: true }, userId: Number, amount: Number, status: String }, { strict: false }));

  const dbUsers = await MongoUser.find().lean();
  users = Object.fromEntries(dbUsers.filter(user => user.number).map(user => [user.number, user]));
  const dbBets = await MongoBet.find().sort({ addTime: -1 }).limit(200).lean();
  betStore = dbBets.reverse();
  console.log(`[DB] Loaded ${dbUsers.length} user records`);

  // Keep the in-memory auth map complete after boot: any account that appears in
  // MongoDB (created by another path/instance after this process started) is
  // merged in, so JWT lookups in getActiveUser never miss an existing user.
  const syncTimer = setInterval(async () => {
    if (!isMongoConnected || !MongoUser || mongoose.connection.readyState !== 1) return;
    try {
      const fresh = await MongoUser.find({ number: { $nin: [null, ''] } }).lean();
      let added = 0;
      for (const dbUser of fresh) {
        if (dbUser.number && !users[dbUser.number]) { users[dbUser.number] = dbUser; added++; }
      }
      if (added) console.log(`[DB] Synced ${added} new user(s) into in-memory auth map`);
    } catch (e) {}
  }, 60000);
  if (typeof syncTimer.unref === 'function') syncTimer.unref();
}

mongoose.connection.on('error', () => {
  isMongoConnected = false;
  console.error('[DB] MongoDB connection failed');
});

// ── Centralized Aviator Engine ────────────────────────────────────────────────
// The 4th argument lets the engine verify a client-supplied token and derive the
// wallet identity server-side; a client's own "userId" claim is never trusted.
function resolveAviatorUserId(token) {
  try {
    const payload = jwt.verify(String(token || '').replace(/^Bearer\s+/i, ''), JWT_SECRET);
    return String(payload.sub);
  } catch (e) {
    return null;
  }
}

let aviatorEngine = new AviatorServerEngine(() => users, saveUsers, () => null, resolveAviatorUserId);

// ── Deterministic result generator per issue ───────────────────────────────────
const wingoResults = [
  { num: 7, colour: 'green',        bs: 'b' },
  { num: 2, colour: 'red',          bs: 's' },
  { num: 0, colour: 'red,violet',   bs: 's' },
  { num: 5, colour: 'green,violet', bs: 'b' },
  { num: 9, colour: 'green',        bs: 'b' },
  { num: 4, colour: 'red',          bs: 's' },
  { num: 8, colour: 'red',          bs: 'b' },
  { num: 1, colour: 'green',        bs: 's' },
  { num: 6, colour: 'red',          bs: 'b' },
  { num: 3, colour: 'green',        bs: 's' }
];

function resultForIssue(issueNumber, gameKey = 'wingo_30s') {
  try {
    const live = getUnifiedLiveResultForIssue(gameKey, issueNumber);
    if (live && live.result !== undefined && live.result !== null) {
      const resStr = String(live.result);
      const details = live.details || {};
      const declared = parseInt(resStr);
      if (!isNaN(declared) && declared >= 0 && declared <= 9 && resStr.length === 1) {
        const colours = {
          0: 'red,violet', 1: 'green', 2: 'red', 3: 'green', 4: 'red',
          5: 'green,violet', 6: 'red', 7: 'green', 8: 'red', 9: 'green'
        };
        const bs = declared >= 5 ? 'b' : 's';
        return { num: declared, colour: colours[declared], bs, premium: resStr };
      } else if (resStr.length === 3) {
        const sum = details.sum || resStr.split('').reduce((a, c) => a + Number(c), 0);
        const bs = sum >= 11 ? 'b' : 's';
        return { num: sum, colour: 'k3', bs, premium: resStr };
      } else if (resStr.length === 5) {
        const sum = details.sum || resStr.split('').reduce((a, c) => a + Number(c), 0);
        const bs = sum >= 23 ? 'b' : 's';
        return { num: Number(resStr[0]), colour: '5d', bs, premium: resStr };
      }
    }
  } catch(e) {}

  // Deterministic fallback
  const seed = issueNumber.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const fallback = wingoResults[seed % wingoResults.length];
  return { ...fallback, premium: String(fallback.num) };
}

function getActiveUser(req = null, requireAuth = false) {
  if (req) {
    let token = '';
    if (req.headers) {
      const authHeader = req.headers['authorization'] || req.headers['x-auth-token'] || req.headers['token'] || '';
      if (authHeader) {
        token = authHeader.replace(/^Bearer\s+/i, '').trim();
      }
    }
    if (!token && req.url) {
      try {
        const u = new URL(req.url, 'http://localhost');
        token = u.searchParams.get('token') || u.searchParams.get('auth_token') || '';
      } catch (e) {}
    }
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET);
        const authenticatedUser = Object.values(users).find(u => String(u.userId) === String(payload.sub));
        if (authenticatedUser) return authenticatedUser;
      } catch (e) {}
    }
  }
  if (requireAuth) {
    return null;
  }
  return null;
}

function createSessionTokens(user) {
  // Access tokens last 7 days so a normal session does not lapse mid-use — the
  // bundle shows "token has expired please login again" and wipes the session on
  // any 401, so a short window kept killing long sessions on the live host.
  const token = jwt.sign({ sub: String(user.userId), username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  const refreshToken = jwt.sign({ sub: String(user.userId), type: 'refresh' }, JWT_SECRET, { expiresIn: '30d' });
  return { token, refreshToken };
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function databaseUnavailable(res) {
  sendJson(res, 503, { code: 503, result: false, msg: 'Authentication service is temporarily unavailable. Please try again later.', msgCode: 503 });
}

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token, Token');
}

function getPublicOrigin(req) {
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProtocol === 'https' ? 'https' : 'http';
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim();
  const host = String(forwardedHost || req.headers.host || 'localhost:3000').replace(/[^a-zA-Z0-9.:-]/g, '');
  return `${protocol}://${host}`;
}


// ── Win/loss evaluation ────────────────────────────────────────────────────────
// Handles colors (red, green, violet), sizes (big, small), and numbers (0-9)
function evaluateBet(bet, result) {
  const { selectType, amount, realAmount, gameKey } = bet;
  const st = String(selectType !== undefined ? selectType : '').trim().toLowerCase();
  const { num, colour, bs } = result;
  let win = false;
  let multiplier = 0;

  const effectiveGameKey = (gameKey || '').toLowerCase();

  if (effectiveGameKey.startsWith('k3')) {
    // K3 dice evaluation
    const diceSum = typeof num === 'number' ? num : parseInt(num);
    const diceBs = bs || (diceSum >= 11 ? 'b' : 's');
    if (st === 'b' || st === 'big' || st === '13' || st === 'h') {
      if (diceBs === 'b') { win = true; multiplier = 2; }
    } else if (st === 's' || st === 'small' || st === '14' || st === 'l') {
      if (diceBs === 's') { win = true; multiplier = 2; }
    } else {
      const betSum = parseInt(st);
      if (!isNaN(betSum) && betSum === diceSum) {
        win = true;
        multiplier = 9;
      }
    }
  } else if (effectiveGameKey.startsWith('5d')) {
    // 5D evaluation
    const firstDigit = typeof num === 'number' ? num : parseInt(num);
    const digitBs = bs || (firstDigit >= 5 ? 'b' : 's');
    if (st === 'b' || st === 'big' || st === '13' || st === 'h') {
      if (digitBs === 'b') { win = true; multiplier = 2; }
    } else if (st === 's' || st === 'small' || st === '14' || st === 'l') {
      if (digitBs === 's') { win = true; multiplier = 2; }
    } else {
      const betNum = parseInt(st);
      if (!isNaN(betNum) && betNum === firstDigit) {
        win = true;
        multiplier = 9;
      }
    }
  } else {
    // WinGo & TRX evaluation
    const targetNum = typeof num === 'number' ? num : parseInt(num);
    const targetColour = String(colour || '').toLowerCase();
    const targetBs = bs || (targetNum >= 5 ? 'b' : 's');

    // 1. Red (code 10 or 'red')
    if (st === '10' || st === 'red') {
      if (targetColour.includes('red')) {
        win = true;
        multiplier = (targetNum === 0) ? 1.47 : 1.95; // 1.95X for Red (1.47X if 0 red+violet)
      }
    }
    // 2. Green (code 11 or 'green')
    else if (st === '11' || st === 'green') {
      if (targetColour.includes('green')) {
        win = true;
        multiplier = (targetNum === 5) ? 1.47 : 1.95; // 1.95X for Green (1.47X if 5 green+violet)
      }
    }
    // 3. Violet / Purple (code 12 or 'violet' or 'purple')
    else if (st === '12' || st === 'violet' || st === 'purple') {
      if (targetColour.includes('violet')) {
        win = true;
        multiplier = 4.50; // 4.50X for Violet
      }
    }
    // 4. Big (code 13 or 'big' or 'h') -> 5, 6, 7, 8, 9
    else if (st === '13' || st === 'big' || st === 'h') {
      if (targetBs === 'b' || targetNum >= 5) {
        win = true;
        multiplier = 1.95; // 1.95X for Big
      }
    }
    // 5. Small (code 14 or 'small' or 'l') -> 0, 1, 2, 3, 4
    else if (st === '14' || st === 'small' || st === 'l') {
      if (targetBs === 's' || targetNum < 5) {
        win = true;
        multiplier = 1.95; // 1.95X for Small
      }
    }
    // 6. Direct number bet (0, 1, 2, 3, 4, 5, 6, 7, 8, 9, OR legacy 15=0 ... 24=9)
    else {
      let betNum = parseInt(st);
      if (betNum >= 15 && betNum <= 24) {
        betNum = betNum - 15;
      }
      if (!isNaN(betNum) && betNum >= 0 && betNum <= 9 && betNum === targetNum) {
        win = true;
        multiplier = 9; // 9X for exact Number
      }
    }
  }

  const base = amount; // Exact multiplier of bet amount: 1.95X for Red/Green, 4.50X for Violet, 9X for Number
  const profitAmount = win ? parseFloat((base * multiplier).toFixed(2)) : 0;
  return { win, profitAmount, multiplier };
}

// Exact moment (server clock) at which the round an issue belongs to ENDS.
// Bets are bound to the server's current round via seq = floor(secondsSinceMidnight / intervalSec) + 1,
// so round `seq` ends at `seq * intervalSec` seconds after midnight of the issue's own
// date (the same calendar the assignment formula uses).
function issueRoundEndMs(issueNumber, intervalSec) {
  const m = /^(\d{4})(\d{2})(\d{2})(\d+)$/.exec(String(issueNumber || ""));
  if (!m) return null;
  const seq = parseInt(m[4], 10);
  if (!seq || seq < 1) return null;
  const dayStart = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).getTime();
  return dayStart + seq * Number(intervalSec || 60) * 1000;
}

async function resolvePendingBets(filterIssues = null) {
  const now = Date.now();
  let resolvedAny = false;

  for (let i = 0; i < betStore.length; i++) {
    const bet = betStore[i];
    if (bet.state !== 0) continue; // already resolved

    const betTime = new Date(bet.addTime).getTime();
    const elapsed = now - betTime;

    const isQueried = Array.isArray(filterIssues) && filterIssues.map(String).includes(String(bet.issueNumber));
    // Resolve when the bet's OWN round has ended — NOT intervalSec after the bet
    // was placed. A bet placed late in a round would otherwise settle up to a
    // full interval into the NEXT round, so its win/loss (and wallet credit)
    // only became visible when the next round's result was already on screen
    // ("number aaya lekin loss dikha, win agle round ke result ke saath").
    const roundEndMs = issueRoundEndMs(bet.issueNumber, Number(bet.intervalSec || 60));
    const isReady = roundEndMs !== null
      ? now >= roundEndMs
      : elapsed >= Math.max(1000, Number(bet.intervalSec || 60) * 1000);

    if (!isReady) continue;

    // Never settle while the DB is unavailable, otherwise the credit write below
    // would reject and we would mark a bet resolved without paying it.
    if (!isMongoConnected || !MongoUser || mongoose.connection.readyState !== 1) continue;

    const gameKey = bet.gameKey || 'wingo_30s';
    const result = resultForIssue(bet.issueNumber, gameKey);
    const { win, profitAmount, multiplier } = evaluateBet(bet, result);
    const winAmount = win ? profitAmount : 0;

    // Find user to credit. The in-memory `users` map is keyed by the login-normalized
    // phone, but the bet was stored with the raw Mongo phone number (`user.number`)
    // and `userId`. A format mismatch (e.g. +91 prefix, leading zeros) makes
    // `users[bet.userNumber]` miss -> the win would be silently dropped (the
    // "my WinGo win never credited / balance all gone" bug). So fall back to Mongo
    // by userId (the stable, unique identifier) to guarantee the bettor is found.
    const userPhone = bet.userNumber || bet.number || null;
    let user = users[userPhone];
    if ((!user || !user.userId) && bet.userId) {
      const byId = typeof bet.userId === 'number' ? { userId: bet.userId } : { userId: bet.userId };
      try {
        user = await MongoUser.findOne(byId).lean();
      } catch (e) { user = null; }
    }

    try {
      if (win && user && winAmount > 0) {
        // Credit FIRST, and only mark the bet resolved after the write succeeds,
        // so a failed credit leaves the bet retryable instead of losing the win.
        const inc = { $inc: { amount: winAmount } };
        const byUserId = typeof user.userId === 'number'
          ? { userId: user.userId }
          : { userId: String(user.userId) };
        let upd = await MongoUser.updateOne(byUserId, inc);
        if (upd.matchedCount === 0 && user.number) {
          upd = await MongoUser.updateOne({ number: user.number }, inc);
        }
        if (upd.matchedCount === 0) {
          console.error(`[WIN PAYOUT] ⚠️ WinGo win NOT persisted to DB for user ${user.number || user.userId} (matched 0 docs). Retryable.`);
        } else {
          console.log(`[WIN PAYOUT] 🎉 WinGo Payout persisted to DB! User: ${user.number || user.username} | Won: ₹${winAmount} on Bet ${bet.orderNumber} (Issue ${bet.issueNumber}). matchedCount=${upd.matchedCount}.`);
        }
        const oldBal = user.amount;
        user.amount = parseFloat((Number(user.amount || 0) + Number(winAmount)).toFixed(2));
        console.log(`[WIN PAYOUT] 🎉 WinGo Payout Credited! User: ${user.number || user.username} | Won: ₹${winAmount} on Bet ${bet.orderNumber} (Issue ${bet.issueNumber}, Select: ${bet.selectType}, Outcome: ${bet.number} ${bet.colour}). Old Balance: ₹${oldBal} -> New Balance: ₹${user.amount}`);
      } else if (!win && user) {
        console.log(`[BET LOSS] Bet ${bet.orderNumber} (Issue ${bet.issueNumber}) lost. Select: ${bet.selectType} vs Result: ${result.num} (${result.colour}).`);
      }
    } catch (err) {
      // Leave state === 0 so the payout is retried on a later tick.
      console.error(`[RESOLVER] Failed to settle bet ${bet.orderNumber}:`, err.message);
      continue;
    }

    bet.state = win ? 1 : 2; // 1 = win, 2 = lose
    bet.profitAmount = win ? profitAmount : -bet.amount;
    bet.winAmount = winAmount;
    bet.multiplier = multiplier || 0;
    bet.number = String(result.num);
    bet.colour = result.colour || "";
    bet.bs = result.bs || "";
    bet.premium = String(result.premium || result.num);
    resolvedAny = true;
  }

  if (resolvedAny) {
    saveUsers();
    saveBets();
  }
}

// Background auto-resolver to credit winnings every 1 second. `await` the call
// inside an async function so a rejection cannot escape the interval as an
// unhandled rejection (which crashes Node on modern versions).
setInterval(() => {
  resolvePendingBets().catch(err => console.error('[RESOLVER]', err.message));
}, 1000);

// The minified frontend bundle reads record items with ORIGINAL-SITE semantics:
//   state: 1 = win ("success"), 2 = pending ("unsettled"), anything else = loss ("fail")
// while our internal storage uses 0 = pending, 1 = win, 2 = loss (see
// resolvePendingBets). It also reads original-API field names (winLoseAmount,
// betTime, premium, ...). This helper returns a copy with every alias the UI
// components look for, so a pending bet no longer renders as "Loss" and the
// win/loss renders the moment its own round settles.
function wingoSelectToContent(selectType) {
  let st = String(selectType ?? "");
  const n = parseInt(st, 10);
  if (n >= 15 && n <= 24) st = String(n - 15); // legacy 15..24 -> numbers 0..9
  switch (st) {
    case "10": return "Color_Red";
    case "11": return "Color_Green";
    case "12": return "Color_Violet";
    case "13": return "BigSmall_Big";
    case "14": return "BigSmall_Small";
    default: return `WinGo_${st}`;
  }
}

function mapBetForUi(bet) {
  const settled = bet.state !== 0;
  const winLose = bet.state === 1 ? (bet.winAmount || 0) : -Number(bet.amount || 0);
  return {
    ...bet,
    // list UI (MayrecordList): 1 = win, 2 = pending ("unsettled"), else loss ("fail")
    state: bet.state === 0 ? 2 : bet.state,
    // detail card UI (MyGameRecord): 1 = pending, 2 = loss, 3 = win
    status: bet.state === 0 ? 1 : (bet.state === 1 ? 3 : 2),
    winLoseAmount: winLose,
    profit: winLose,
    betTime: bet.addTime,
    createTime: bet.addTime,
    openingTime: bet.addTime,
    openingResult: settled ? String(bet.number ?? bet.premium ?? "") : "",
    premium: settled ? String(bet.premium ?? bet.number ?? "") : "",
    winningNum: bet.state === 1 ? String(bet.number ?? "") : "",
    winningAmount: bet.winAmount || 0,
    realBettingAmount: bet.realAmount ?? bet.amount,
    orderNo: bet.orderNumber,
    id: bet.orderNumber,
    betMultiple: bet.betCount ?? 1,
    betContent: wingoSelectToContent(bet.selectType),
    bettingContent: wingoSelectToContent(bet.selectType),
    bettingFormat: 1,
    issueNoStatus: bet.state === 0 ? 1 : 0,
    playType: "winGo"
  };
}

function normalizeNumber(raw) {
  let cleaned = String(raw || '').trim().replace(/[^\d]/g, '');
  let numberType = "91";
  let number = cleaned;
  if (cleaned.startsWith("91") && cleaned.length > 10) {
    number = cleaned.slice(2);
  }
  return { number, numberType, fullUsername: "91" + number };
}

function getRequestBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (e) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

const DEFAULT_USER_INFO = {
  sign: "E6F79B02C2540B4A8F94962598CA9D36715352AAF21277EE8D50FC7E33CBFC72",
  userId: 1677637,
  userPhoto: "1",
  userName: "919068839558",
  nickName: "MemberNNGKZZD9",
  amount: 0.00,
  amountofCode: 0,
  isWithdraw: 1,
  message: null,
  withdrawCount: 0,
  addTime: "2026-09-30 23:55:53",
  userLoginDate: "2026-10-01 03:42:31",
  fee: 0,
  unRead: 0,
  uRate: 102,
  trxRate: 10.8,
  uGold: 0,
  googleVerify: 0,
  isvalidator: 0,
  isRePwd: "1",
  integral: 100,
  isOpenPointMall: "1",
  isOpenAmountOfCode: "1",
  isOpenOfficialRechargeInputDialog: "0",
  isAllowUserAddUSDT: "0",
  isShowWalletTotalCT: "0",
  isShowRechargeBankList: "0",
  isPopupCommissionSwitch: "1",
  groupDataShowAuth: [
    { id: 11, isShow: true },
    { id: 12, isShow: true },
    { id: 15, isShow: true },
    { id: 16, isShow: true },
    { id: 17, isShow: true },
    { id: 18, isShow: true },
    { id: 19, isShow: false },
    { id: 20, isShow: true }
  ],
  verifyMethods: { mobile: "919068839558", email: "", google: "0" },
  regType: 1,
  userGroupAuth: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
  bindReward: 0,
  isGoogle: "1",
  isOpenChampion: "0",
  isAllowWithdraw: 1,
  userRechargeTimes: 1,
  allowNoRechargeGame: "1",
  isPartnerReward: "1",
  canDirectToGame: true,
  isOpenNewSafe: "0",
  useLanguage: "en",
  channelAmountofCode: 0,
  unUsedRechargeCouponCount: 0
};

// Simulated WinGo 30S Lottery cycle generator
function getCurrentWinGoIssue() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const issueSeq = Math.floor(totalSeconds / 30) + 1;
  const issueNumber = `${dateStr}${String(issueSeq).padStart(4, '0')}`;
  const preIssue = `${dateStr}${String(Math.max(1, issueSeq - 1)).padStart(4, '0')}`;
  const secondsLeft = 30 - (totalSeconds % 30);
  const live = getUnifiedLiveResultForIssue('wingo_30s', preIssue);

  return {
    issueNumber,
    preIssue,
    seconds: secondsLeft,
    lotteryTime: 30,
    preResult: String(live?.result ?? "7")
  };
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch(error => {
    console.error('[SERVER] Request failed:', error.message);
    if (!res.headersSent) {
      sendJson(res, 500, { code: 500, result: false, msg: 'The server could not process this request.', msgCode: 500 });
    } else if (!res.writableEnded) {
      res.end();
    }
  });
});

async function handleRequest(req, res) {
  // CORS is only needed for a separately hosted frontend; same-origin deployments need no special case.
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  let reqPath = decodeURI(parsedUrl.pathname);

  if (reqPath === '/ar-sw.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end('// sw disabled');
    return;
  }

  // 0. Serve UPI Gateway Pages
  if (reqPath === '/upi-qr' || reqPath === '/upi-qr/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, 'gateways', 'upi_qr.html')).pipe(res);
    return;
  }
  if (reqPath === '/upixqr' || reqPath === '/upixqr/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, 'gateways', 'upix_qr.html')).pipe(res);
    return;
  }
  if (reqPath === '/wallet-qr' || reqPath === '/wallet-qr/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, 'gateways', 'wallet_qr.html')).pipe(res);
    return;
  }
  if (reqPath === '/paytmqr' || reqPath === '/paytmqr/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    fs.createReadStream(path.join(PUBLIC_DIR, 'gateways', 'paytm_qr.html')).pipe(res);
    return;
  }

  // 0.05 Serve Uploads Directory (Receipts, Gateway QR codes, etc.)
  if (reqPath.startsWith('/uploads/')) {
    const uploadFilePath = safeStaticPath(reqPath);
    if (uploadFilePath && fs.existsSync(uploadFilePath) && fs.statSync(uploadFilePath).isFile()) {
      const ext = path.extname(uploadFilePath).toLowerCase();
      const ct = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(uploadFilePath).pipe(res);
      return;
    }
  }

  // 0.1 Serve Admin Static Files at /admin/
  if (reqPath.startsWith('/admin/')) {
    const adminFilePath = safeStaticPath(reqPath);
    if (adminFilePath && fs.existsSync(adminFilePath) && fs.statSync(adminFilePath).isFile()) {
      const ext = path.extname(adminFilePath).toLowerCase();
      const ct = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' });
      fs.createReadStream(adminFilePath).pipe(res);
      return;
    }
  }

  // 0.1 Admin API Endpoints
  if (reqPath.startsWith('/api/admin/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    // Same-origin admin console; do NOT open admin APIs to every origin.
    setCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const endpoint = reqPath.split('?')[0];
    const body = await getRequestBody(req);

    // Auth endpoints (login / logout). handleAdminAuth returns null when the
    // method is not supported; answer 405 instead of dereferencing null.
    if (endpoint === '/api/admin/login' || endpoint === '/api/admin/logout') {
      const authRes = await handleAdminAuth(endpoint, req.method, body, req);
      if (!authRes) {
        res.writeHead(405, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 405, result: false, msg: 'Method not allowed' }));
        return;
      }
      res.writeHead(authRes.code === 0 ? 200 : authRes.code);
      res.end(JSON.stringify(authRes));
      return;
    }

    // Auth Verification Guard
    if (!verifyAdminAuth(req)) {
      res.writeHead(401);
      res.end(JSON.stringify({ code: 401, result: false, msg: 'Unauthorized: Admin authentication token required' }));
      return;
    }

    // ── TEMPORARY diagnostic (admin only) — inspect per-instance state to debug
    // "manual approve does not credit the wallet" on the live host. Removed
    // once the root cause is confirmed. ─────────────────────────────────────
    if (endpoint === '/api/admin/diag') {
      const out = {
        pid: process.pid,
        uptimeSec: Math.round(process.uptime()),
        node: process.version,
        memUserCount: Object.keys(users).length,
        memUsers: Object.values(users).slice(0, 50).map(u => ({
          userId: u?.userId, number: u?.number, amount: u?.amount
        })),
        adminBackend: typeof adminDiag === 'function' ? adminDiag() : { walletStoreInjected: false, note: 'adminDiag binding missing' },
        localUsersFile: null,
        localRechargesCount: null,
        mongo: null
      };
      try {
        const p = path.join(__dirname, 'local_users.json');
        if (fs.existsSync(p)) {
          const lu = JSON.parse(fs.readFileSync(p, 'utf8'));
          out.localUsersFile = Object.entries(lu).map(([k, u]) => ({ key: k, userId: u?.userId, amount: u?.amount }));
        }
        const rp = path.join(__dirname, 'local_recharges.json');
        if (fs.existsSync(rp)) out.localRechargesCount = JSON.parse(fs.readFileSync(rp, 'utf8')).length;
      } catch (e) { out.fileErr = e.message; }
      try {
        if (isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
          const docs = await MongoUser.find().lean();
          out.mongo = {
            ready: true,
            count: docs.length,
            users: docs.map(d => ({ userId: d.userId, number: d.number, amount: d.amount }))
          };
          if (MongoRecharge) out.mongo.rechargeCount = await MongoRecharge.countDocuments();
        } else {
          out.mongo = { ready: false, state: mongoose.connection.readyState };
        }
      } catch (e) { out.mongo = { error: e.message }; }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(out));
      return;
    }

    // Current Admin Info
    if (endpoint === '/api/admin/me') {
      const authRes = await handleAdminAuth(endpoint, req.method, body, req);
      res.writeHead(200);
      res.end(JSON.stringify(authRes));
      return;
    }

    // Dashboard KPIs & Analytics
    if (endpoint === '/api/admin/dashboard') {
      const dashRes = await handleAdminDashboard(parsedUrl.searchParams);
      res.writeHead(200);
      res.end(JSON.stringify(dashRes));
      return;
    }

    // Games Management
    if (endpoint.startsWith('/api/admin/games')) {
      const gamesRes = await handleAdminGames(endpoint, req.method, body);
      if (gamesRes) {
        res.writeHead(gamesRes.code === 0 ? 200 : gamesRes.code || 400);
        res.end(JSON.stringify(gamesRes));
        return;
      }
    }

    // Hack Bots
    if (endpoint.startsWith('/api/admin/hack-bots')) {
      const botsRes = await handleAdminHackBots(endpoint, req.method, body, aviatorEngine);
      if (botsRes) {
        res.writeHead(botsRes.code === 0 ? 200 : botsRes.code || 400);
        res.end(JSON.stringify(botsRes));
        return;
      }
    }

    // Recharges
      if (endpoint.startsWith('/api/admin/recharges')) {
        const recRes = await handleAdminRecharges(endpoint, req.method, body);
        if (recRes) {
          res.writeHead(recRes.code === 0 ? 200 : recRes.code || 400);
        res.end(JSON.stringify(recRes));
        return;
      }
    }

    // Gateways Management
    if (endpoint.startsWith('/api/admin/gateways')) {
      const gwRes = await handleAdminGateways(endpoint, req.method, body);
      if (gwRes) {
        res.writeHead(gwRes.code === 0 ? 200 : gwRes.code || 400);
        res.end(JSON.stringify(gwRes));
        return;
      }
    }

    // Withdrawals
    if (endpoint.startsWith('/api/admin/withdrawals')) {
      const wthRes = await handleAdminWithdrawals(endpoint, req.method, body, parsedUrl.searchParams);
      if (wthRes) {
        res.writeHead(wthRes.code === 0 ? 200 : wthRes.code || 400);
        res.end(JSON.stringify(wthRes));
        return;
      }
    }

    // Users
      if (endpoint.startsWith('/api/admin/users')) {
        const usersRes = await handleAdminUsers(endpoint, req.method, body, parsedUrl.searchParams);
        if (usersRes) {
          res.writeHead(usersRes.code === 0 ? 200 : usersRes.code || 400);
        res.end(JSON.stringify(usersRes));
        return;
      }
    }

    // Audit Logs
    if (endpoint === '/api/admin/audit-logs') {
      const auditRes = await handleAdminAudit(endpoint);
      res.writeHead(200);
      res.end(JSON.stringify(auditRes));
      return;
    }
  }

  // 1. Serve embedded game static files at /games/<slug>/
  const GAME_SLUGS = ['chicken-road', 'chicken-road-2', 'aviator', 'mega-block', 'tower-dash'];
  const gameMatch = reqPath.match(/^\/games\/([^/]+)(\/.*)$/);
  if (gameMatch) {
    const slug = gameMatch[1];
    const rest = gameMatch[2] || '/index.html';
    if (GAME_SLUGS.includes(slug)) {
      // Check if game is marked Hidden by admin
      try {
        const gamesJsonPath = path.join(__dirname, 'local_games.json');
        if (fs.existsSync(gamesJsonPath)) {
          const gameList = JSON.parse(fs.readFileSync(gamesJsonPath, 'utf8'));
          const gameObj = gameList.find(g => g.gameCode === slug || g.gameCode === slug.replace(/-/g, '_'));
          if (gameObj && gameObj.status === 'Hidden') {
            const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
            const isAdmin = authHeader.includes('admin') || req.headers.referer?.includes('FORNTMAN-OG');
            if (!isAdmin) {
              res.writeHead(302, { Location: '/#/' });
              res.end();
              return;
            }
          }
        }
      } catch (e) {}

      const GAMES_DIR = path.join(__dirname, 'archived_site', 'games', slug);
      let gFilePath = path.join(GAMES_DIR, rest === '/' ? 'index.html' : rest);
      // Normalise: strip query string artefacts already handled by parsedUrl
      if (!fs.existsSync(gFilePath) && fs.existsSync(gFilePath + '.html')) gFilePath = gFilePath + '.html';
      if (!fs.existsSync(gFilePath) && fs.existsSync(path.join(gFilePath, 'index.html'))) gFilePath = path.join(gFilePath, 'index.html');
      if (fs.existsSync(gFilePath) && fs.statSync(gFilePath).isFile()) {
        const ext = path.extname(gFilePath).toLowerCase();
        const ct = MIME_TYPES[ext] || 'application/octet-stream';
        const headers = { 'Content-Type': ct, 'Access-Control-Allow-Origin': '*' };
        // The game's HTML embeds the wallet bridge. Without an explicit policy the
        // browser is free to reuse a stale copy, which left players running an
        // older bridge (the one that showed 0.00 / wiped the balance) long after a
        // fix had been deployed. Hashed assets keep their own caching.
        if (ext === '.html' || ext === '.htm') headers['Cache-Control'] = 'no-store, must-revalidate';
        else headers['Cache-Control'] = 'public, max-age=3600';
        res.writeHead(200, headers);
        fs.createReadStream(gFilePath).pipe(res);
      } else {
        // A missing *asset* (chunk, wasm, texture, audio…) must 404. Serving the
        // game's index.html here made the client's chunk loader (and their
        // asset-retry plugin) parse HTML as JavaScript — "Unexpected token '<'"
        // → ChunkLoadError → endless reload / a loading screen that never ends.
        const ext = path.extname(gFilePath).toLowerCase();
        if (['.js', '.mjs', '.css', '.json', '.wasm', '.br', '.data', '.png', '.jpg', '.jpeg', '.svg',
             '.webp', '.ktx2', '.basis', '.bytes', '.skel', '.ttf', '.woff', '.woff2', '.mp3',
             '.wav', '.ogg', '.webm', '.m4a', '.map'].includes(ext)) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end(`404 Not Found: ${reqPath}`);
          return;
        }
        // SPA fallback → serve game index.html
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(path.join(GAMES_DIR, 'index.html')).pipe(res);
      }
      return;
    }
  }
  // Route: /games/<slug> (without trailing slash) → redirect to /games/<slug>/
  const gameRootMatch = reqPath.match(/^\/games\/([^/]+)$/);
  if (gameRootMatch && GAME_SLUGS.includes(gameRootMatch[1])) {
    res.writeHead(301, { Location: `/games/${gameRootMatch[1]}/` });
    res.end();
    return;
  }

  // 1.1 Handle Web Config
  if (reqPath.startsWith('/web/config')) {
    res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
    res.end('window._domain={"checkApiDomain":false,"checkApk":false,"VITE_SAAS_API_URL":"","VITE_SAAS_JSON_URL":"","VITE_BAST_URL":"","VITE_API_URL":"","pwaDomain":""};');
    return;
  }

  // 1.2 Handle Interactive Third-party Game Frame
  if (reqPath.startsWith('/game-frame')) {
    res.writeHead(302, { Location: '/#/' });
    res.end();
    return;
  }

  // ── Game Wallet Balance Sync API (before generic /api/ handler) ──────────────
  if (reqPath === '/api/game-wallet') {
    setCorsHeaders(req, res);
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const user = getActiveUser(req, true);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 4, result: false, msg: 'Authentication required' }));
      return;
    }
    if (req.method === 'POST') {
      const body = await getRequestBody(req);

      // A hardened game bridge reports how the balance *moved* (delta), having
      // loaded the authoritative balance first. That is the only report that can
      // safely be applied: an absolute value is meaningless when the sender may
      // still be holding a boot-time placeholder, which is how a stale 0 used to
      // erase a real balance. Older bridges keep working via the fallback below.
      const rawDelta = body.delta;
      const hasDelta = rawDelta !== undefined && rawDelta !== null && rawDelta !== '';
      let delta;
      let reported = null;

      if (hasDelta) {
        delta = parseFloat(rawDelta);
        if (!Number.isFinite(delta)) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ code: 1, result: false, msg: 'Invalid delta' }));
          return;
        }
      } else {
        reported = parseFloat(body.balance);
        // Validate: must be a finite, non-negative balance reported by the game iframe.
        if (!Number.isFinite(reported) || reported < 0) {
          res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ code: 1, result: false, msg: 'Invalid balance' }));
          return;
        }
      }

      // The in-memory copy can be stale across instances; Mongo holds the truth.
      await refreshAmountFromDb(user);
      const current = (typeof user.amount === 'number' && Number.isFinite(user.amount)) ? user.amount : 0.00;

      // With no explicit delta the report is an absolute balance, which is only
      // meaningful relative to what we currently hold.
      if (!hasDelta) delta = reported - current;

      // Apply the game's win/loss delta:
      //  - positive delta (a win) is capped per-sync to bound one-shot minting;
      //  - negative delta (a bet loss syncing back down) is honored but the
      //    wallet never goes below 0.
      if (delta > MAX_WALLET_SYNC_INCREASE) {
        console.warn(`[wallet] Clamped win from ₹${delta} to ₹${MAX_WALLET_SYNC_INCREASE} (game: ${body.slug || 'unknown'}, userId ${user.userId})`);
        delta = MAX_WALLET_SYNC_INCREASE;
      } else if (delta < -current) {
        delta = -current; // floor at 0
      }

      const oldBal = current;
      if (delta !== 0) {
        user.amount = parseFloat((current + delta).toFixed(2));
        if (MongoUser && isMongoConnected && mongoose.connection.readyState === 1) {
          MongoUser.updateOne({ userId: user.userId }, { $set: { amount: user.amount } }).catch(err =>
            console.error(`[wallet] persist failed for userId ${user.userId}:`, err.message));
        }
        saveUsers();
        console.log(`[wallet] ₹${oldBal} → ₹${user.amount} (game: ${body.slug || 'unknown'}, userId ${user.userId}, delta ₹${delta})`);
      }
      res.end(JSON.stringify({ code: 0, result: true, balance: user.amount }));
    } else {
      await refreshAmountFromDb(user);
      const currentBal = (typeof user.amount === 'number' && Number.isFinite(user.amount)) ? user.amount : 0.00;
      res.end(JSON.stringify({ code: 0, result: true, balance: currentBal }));
    }
    return;
  }

  // ── Gateway Status Public API ───────────────────────────────────────────────
  if (reqPath.startsWith('/api/gateways/status')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const gId = parsedUrl.searchParams.get('gateway') || parsedUrl.searchParams.get('slug') || 'upi-qr';
    let gateways = {};
    try {
      if (fs.existsSync(GATEWAYS_FILE)) gateways = JSON.parse(fs.readFileSync(GATEWAYS_FILE, 'utf-8'));
    } catch (e) {}
    const gw = gateways[gId] || Object.values(gateways).find(g => g.route === '/' + gId || g.id === gId) || {
      id: gId,
      name: gId.toUpperCase(),
      enabled: true,
      qrImage: `/uploads/gateways/${gId.replace('-', '_')}.svg`
    };
    res.end(JSON.stringify({ code: 0, result: true, data: gw }));
    return;
  }

  // ── Recharge Request Submission from Gateways ──────────────────────────────
  if (reqPath === '/api/recharge/submit' && req.method === 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    const body = await getRequestBody(req);
    const { gateway, userId, amount, utrNumber, fullName, screenshot, token, session } = body;

    // Server-side Authentication Verification (in-memory first, then a direct
    // MongoDB lookup by the JWT subject — a stale/empty in-memory map after a
    // process restart must not reject a perfectly valid session token).
    let authUser = getActiveUser(req, false);
    if (!authUser && token) {
      try {
        const payload = jwt.verify(String(token).replace(/^Bearer\s+/i, ''), JWT_SECRET);
        authUser = Object.values(users).find(user => String(user.userId) === String(payload.sub)) || null;
        if (!authUser && isMongoConnected && MongoUser && mongoose.connection.readyState === 1) {
          let dbUser = await MongoUser.findOne({ userId: Number(payload.sub) }).lean();
          if (!dbUser) dbUser = await MongoUser.findOne({ userId: String(payload.sub) }).lean();
          if (dbUser && dbUser.number) {
            users[dbUser.number] = users[dbUser.number] || dbUser;
            authUser = users[dbUser.number];
          }
        }
      } catch (e) {}
    }
    if (authUser && userId && String(authUser.userId) !== String(userId)) authUser = null;
    if (!authUser) {
      res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ code: 401, result: false, msg: 'Authentication required. Please login before making a recharge.' }));
      return;
    }

    // Strict Validations
    const numAmt = parseFloat(Number(amount).toFixed(2));
    if (isNaN(numAmt) || numAmt < 100 || numAmt > 50000) {
      res.writeHead(400);
      res.end(JSON.stringify({ code: 400, result: false, msg: 'Recharge amount must be between ₹100 and ₹50,000.' }));
      return;
    }

    const cleanUtr = String(utrNumber || body.utr || '').trim();
    if (!/^\d{10,12}$/.test(cleanUtr)) {
      res.writeHead(400);
      res.end(JSON.stringify({ code: 400, result: false, msg: 'UTR Number must be strictly between 10 and 12 digits only.' }));
      return;
    }
    const cleanFullName = String(fullName || authUser.nickName || `Member${authUser.number?.slice(-4)}` || 'Member').trim();
    if (!screenshot) {
      res.writeHead(400);
      res.end(JSON.stringify({ code: 400, result: false, msg: 'Payment Screenshot is required.' }));
      return;
    }

    // Save screenshot image
    let screenshotUrl = '/assets/receipts/receipt_sample_1.svg';
    try {
      const uploadsDir = path.join(PUBLIC_DIR, 'uploads', 'recharges');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      if (screenshot.startsWith('data:image/')) {
        const matches = screenshot.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
        if (matches) {
          const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
          const buffer = Buffer.from(matches[2], 'base64');
          const filename = `rec_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}.${ext}`;
          fs.writeFileSync(path.join(uploadsDir, filename), buffer);
          screenshotUrl = `/uploads/recharges/${filename}`;
        }
      }
    } catch (err) {
      console.error('Error saving screenshot:', err);
    }

    let recharges = [];
    try {
      if (fs.existsSync(RECHARGES_FILE)) recharges = JSON.parse(fs.readFileSync(RECHARGES_FILE, 'utf-8'));
    } catch (e) {}

    const newRec = {
      id: `REC-${1000 + recharges.length + 1}`,
      userId: authUser.userId,
      username: authUser.username || `91${authUser.number}`,
      phoneNumber: authUser.number || String(authUser.userId),
      fullName: cleanFullName,
      paymentMode: gateway || 'UPI-QR',
      amount: numAmt,
      utrNumber: cleanUtr,
      screenshotUrl,
      status: 'Pending', // Strictly controlled server-side: the wallet is only
                          // credited when an admin accepts the recharge via
                          // POST /api/admin/recharges/action (action: 'Accept').
      token: token || '',
      session: session || '',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      processedAt: null
    };

    recharges.unshift(newRec);
    try {
      fs.writeFileSync(RECHARGES_FILE, JSON.stringify(recharges, null, 2), 'utf-8');
    } catch (e) {}

    if (isMongoConnected && MongoRecharge && mongoose.connection.readyState === 1) {
      MongoRecharge.updateOne({ id: newRec.id }, { $set: newRec }, { upsert: true }).catch(() => {});
    }

    console.log(`[RECHARGE] ${newRec.id} PENDING admin verification: UID ${newRec.userId} | UTR ${newRec.utrNumber} | Amount ₹${newRec.amount}`);

    res.end(JSON.stringify({
      code: 0,
      result: true,
      msg: 'Recharge request submitted successfully! Pending admin verification.',
      data: newRec
    }));
    return;
  }


  // Aviator App Config & Demo Endpoints
  if (reqPath.includes('/aviator/demo') || reqPath.includes('/app-config')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    const hostHeader = req.headers.host || 'localhost';
    const isHttps = req.headers['x-forwarded-proto'] === 'https';
    const wsHost = hostHeader.split(':')[0];
    const wsPort = hostHeader.includes(':') ? parseInt(hostHeader.split(':')[1]) : (isHttps ? 443 : 80);

    res.end(JSON.stringify({
      ws: {
        host: wsHost,
        port: wsPort,
        zone: "aviator_core",
        debug: false,
        useSSL: isHttps
      },
      servers: [
        {
          host: wsHost,
          port: wsPort,
          zone: "aviator_core",
          debug: false,
          useSSL: isHttps
        }
      ],
      brandLogo: "",
      brandName: "DMFirst",
      userWithOperator: true
    }));
    return;
  }

  // Universal Auth Mock for Games (Chicken Road 1 & 2, InOut Games)
  if (reqPath === '/api/auth' || reqPath === '/auth' || reqPath.endsWith('/auth')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Country-Code', 'US');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      code: 0,
      success: true,
      result: "mock_jwt_token_valid_12345",
      data: "mock_jwt_token_valid_12345",
      token: "mock_jwt_token_valid_12345",
      bonuses: [],
      isLobbyEnabled: false,
      isMusicEnabled: true,
      isSoundEnabled: true,
      isPromoCodeEnabled: false,
      difficultyLevel: "EASY"
    }));
    return;
  }

  // Online Counter for Chicken Road
  if (reqPath.startsWith('/api/online-counter')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      online: 1482,
      count: 1482,
      data: 1482
    }));
    return;
  }

  // Tournaments Mock for Chicken Road 2
  if (reqPath.startsWith('/api/tournaments')) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      tournaments: [],
      data: []
    }));
    return;
  }

  // 2. Handle API Mock Routes
  if (reqPath.startsWith('/api/') || reqPath.startsWith('/Lottery/')) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    let endpoint = reqPath.split('?')[0];
    const body = await getRequestBody(req);

    // Register Endpoint: Allows new phone numbers to register with 0.00 initial balance. Rejects already registered.
    if (endpoint.includes('Register') && !endpoint.includes('RegisterState')) {
      console.log('[AUTH] Register request received');
      if (req.method !== 'POST') {
        sendJson(res, 405, { code: 405, result: false, msg: 'Method not allowed', msgCode: 405 });
        return;
      }
      if (!isMongoConnected || !MongoUser || mongoose.connection.readyState !== 1) {
        console.error('[AUTH] Register failed: database unavailable');
        databaseUnavailable(res);
        return;
      }
      const { number, numberType, fullUsername } = normalizeNumber(body.username);
      const chosenNumber = number;
      const full = "91" + chosenNumber;

      if (!chosenNumber || !body.pwd || String(body.pwd).length < 6) {
        sendJson(res, 400, { code: 400, result: false, msg: 'A valid phone number and password of at least 6 characters are required.', msgCode: 400 });
        return;
      }

      if (await MongoUser.exists({ $or: [{ number: chosenNumber }, { username: full }] })) {
        sendJson(res, 409, {
          code: 104,
          result: false,
          msg: "Account already exists, please login instead.",
          msgCode: 104
        });
        return;
      }

      const userId = 1000000 + Math.floor(Math.random() * 8999999);
      const inviteCode = String(body.invitecode || body.invitationCode || '').trim();

      // Check if referrer exists (UID + phone number)
      let referrerUser = null;
      if (inviteCode) {
        for (const u of Object.values(users)) {
          const expectedCode = `${u.userId}${u.number}`;
          if (expectedCode === inviteCode || String(u.userId) === inviteCode || u.number === inviteCode) {
            referrerUser = u;
            break;
          }
        }
      }

      const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

      const passwordHash = await bcrypt.hash(String(body.pwd), 12);
      const newUser = {
        userId,
        number: chosenNumber,
        numberType: "91",
        username: full,
        password: passwordHash,
        amount: 0.00, // STRICT: Always 0.00 on registration!
        nickName: "Member" + chosenNumber.slice(-4),
        invitedBy: referrerUser ? referrerUser.userId : null,
        referralToken: inviteCode,
        referrals: [],
        spinWheelChances: 1, // New user gets 1 free Spin Wheel chance!
        registeredAt: now,
        dailySignCount: 0
      };
      await MongoUser.create(newUser);
      users[chosenNumber] = newUser;

      if (referrerUser) {
        if (!referrerUser.referrals) referrerUser.referrals = [];
        referrerUser.referrals.unshift({
          userId,
          username: full,
          nickName: users[chosenNumber].nickName,
          joinedAt: now,
          status: "New referral joined"
        });
        console.log(`[Referral] User ${chosenNumber} registered using invite code of ${referrerUser.username}!`);
      }

      
      saveUsers();

      console.log(`[AUTH] Register succeeded for user ID ${userId}`);
      const session = createSessionTokens(newUser);

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        msgCode: 0,
        data: {
          token: session.token,
          tokenHeader: "Bearer ",
          refreshToken: session.refreshToken,
          parentUserId: userId,
          lotteryLoginUrl: "",
          webSocketUrl: "",
          webSocketChannels: [],
          webSocketTokenExpireAt: 0,
          regReceivedRechargeCoupons: []
        }
      }));
      return;
    }

    // RegisterState
    if (endpoint.includes('RegisterState')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        msgCode: 0,
        data: {
          isOpenRegisterSMS: "0",
          isOpenRegisterEmail: "0",
          registerEmailState: "0",
          registerMobileState: "1",
          registerPrivacyChecked: "1",
          registerStateMsg: null,
          isOpenForgetPasswordSMS: "1",
          isOpenForgetPasswordEmail: "0",
          isOpenAddWithdrawSMS: "0",
          isOpenAddWithdrawEmail: "0",
          isOpenCaptcha: "0",
          isOpenRegisterCaptcha: "0",
          isOpenGoogleVerifySms: "0",
          isOpenGoogleVerifyEmail: "0",
          addBankCardOpenEmail: "0",
          isOpenExternalAccount: "0",
          isInvitecode: "0",
          cfTurnstileSiteKey: "",
          cfTurnstileApiDomain: "https://challenges.cloudflare.com"
        }
      }));
      return;
    }

    // GetHomeSettings
    if (endpoint.includes('GetHomeSettings')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        msgCode: 0,
        data: {
          version: "2026-04-20 001",
          arUpiInputUtrSwitch: false,
          arbApiUrl: [],
          isShowAppDownloadUp: false,
          isShowAppDownloadDown: true,
          isShowRewardCenter: true,
          isShowLotteryDragon: true,
          isSplitLocalEWallet: true,
          jackportMaxReswadAmount: 500.00,
          projectName: "dmfirst",
          projectLogo: "/dmfirst/other/h5setting_20260831205223148v.png",
          languages: "en|hd",
          webIco: "/dmfirst/other/h5setting_20260831205232ljah.png",
          headLogo: "/dmfirst/other/h5setting_202608312052286nxa.png",
          dollarSign: "₹",
          upperOrLower: "0",
          defaultCurrentLanguage: "en",
          registerMobile: "1",
          registerEmail: "0",
          areaPhoneLenList: [{ area: "+91", len: "9-12" }],
          registerSms: "0",
          isOpenLoginChangeLanguage: "1",
          rewardValidityTime: 3,
          isOpenActivityAward: true,
          isOpenTurntable: true,
          isPartnerReward: true,
          isSelfCustomerService: true,
          webSiteUrl: getPublicOrigin(req),
          isOpenFacebookEvent: false,
          firstDepositRewardCodeAmount: "1",
          isOpenRegisterPhoneFirstZeroSwitch: false,
          isOpenAdjustEvent: false,
          firebaseConfig: null,
          isOpenArLottery: false,
          isSwitchSaasBalance: true,
          isV3Mode: true,
          isOpenRechargeAutoWeight: true,
          isOpenInvitedWheel: true,
          invitedWheelTotalPrizeAmount: 500.0,
          isOpenDownAppRewardSwitch: true,
          isShowDownAppBonusAmountSwitch: true,
          downAppBonusAmount: 28.0,
          downAppRechargeAmount: 1000.0,
          needKycValidIsOpen: false,
          needFastKycValidIsOpen: false,
          lotteryDragonIcon: "",
          bonusCenterImgUrl: "",
          homeBigTurntableSwitch: false,
          jgConfig: { webConfig: null, appConfig: null },
          lastestAppVersionInfo: null
        }
      }));
      return;
    }

    // RefreshToken / Login
    if (endpoint.includes('Login') && !endpoint.includes('LoginOff')) {
      console.log('[AUTH] Login request received');
      if (req.method !== 'POST') {
        sendJson(res, 405, { code: 405, result: false, msg: 'Method not allowed', msgCode: 405 });
        return;
      }
      if (!isMongoConnected || !MongoUser || mongoose.connection.readyState !== 1) {
        console.error('[AUTH] Login failed: database unavailable');
        databaseUnavailable(res);
        return;
      }
      const { number } = normalizeNumber(body.username);
      const chosenNumber = number;

      if (!chosenNumber || !body.pwd) {
        sendJson(res, 400, { code: 400, result: false, msg: 'Phone number and password are required.', msgCode: 400 });
        return;
      }

      const user = await MongoUser.findOne({ number: chosenNumber }).lean();
      if (!user) {
        sendJson(res, 404, {
          code: 101,
          result: false,
          msg: "Account does not exist, please register first.",
          msgCode: 101
        });
        return;
      }

      // Password verification
      const passwordMatches = user.password?.startsWith('$2')
        ? await bcrypt.compare(String(body.pwd), user.password)
        : String(user.password) === String(body.pwd);
      if (!passwordMatches) {
        console.warn('[AUTH] Login failed: invalid credentials');
        sendJson(res, 401, {
          code: 102,
          result: false,
          msg: "Incorrect password, please try again.",
          msgCode: 102
        });
        return;
      }

      // Migrate a legacy plaintext password after a successful verification.
      if (!user.password?.startsWith('$2')) {
        user.password = await bcrypt.hash(String(body.pwd), 12);
        await MongoUser.updateOne({ _id: user._id }, { $set: { password: user.password } });
      }

      if (user && user.isBanned) {
        console.log(`[!] Banned user attempt blocked: ${chosenNumber} (ID: ${user.userId})`);
        res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          code: 403,
          result: false,
          msg: "Your account has been suspended by the administrator. All active sessions have been revoked.",
          msgCode: 403
        }));
        return;
      }

      
      users[chosenNumber] = user;
      console.log(`[AUTH] Login succeeded for user ID ${user.userId}`);
      const session = createSessionTokens(user);

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        msgCode: 0,
        data: {
          token: session.token,
          tokenHeader: "Bearer ",
          refreshToken: session.refreshToken,
          parentUserId: user.userId,
          lotteryLoginUrl: ""
        }
      }));
      return;
    }

    if (endpoint.includes('RefreshToken')) {
      const user = getActiveUser(req, true);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 4, result: false, msg: "Session expired. Please log in again.", msgCode: 4 }));
        return;
      }
      const session = createSessionTokens(user);
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          token: session.token,
          tokenHeader: "Bearer ",
          refreshToken: session.refreshToken
        }
      }));
      return;
    }

    if (endpoint.includes('LoginOff')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        data: true
      }));
      return;
    }

    // GetUserInfo (Requires valid session)
    if (endpoint.includes('GetUserInfo')) {
      const user = getActiveUser(req, true);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          code: 4,
          result: false,
          msg: "Authentication required or session expired. Please log in.",
          msgCode: 4
        }));
        return;
      }

      await refreshAmountFromDb(user);
      const userBal = (typeof user.amount === 'number') ? user.amount : 0.00;

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          ...DEFAULT_USER_INFO,
          userId: user.userId,
          userName: user.username,
          nickName: user.nickName,
          amount: userBal,
          verifyMethods: {
            mobile: user.username,
            email: "",
            google: "0"
          }
        }
      }));
      return;
    }

    // Wallets & Balance APIs (Requires valid session)
    if (endpoint.includes('GetBalance') || endpoint.includes('GetAllwallets') || endpoint.includes('GetSaasAllwallets') || endpoint.includes('GetARGameAndPlatWallets') || endpoint.includes('GetThirdPartyWallet')) {
      const user = getActiveUser(req, true);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          code: 4,
          result: false,
          msg: "Authentication required.",
          msgCode: 4
        }));
        return;
      }

      await refreshAmountFromDb(user);
      const userBal = (typeof user.amount === 'number') ? user.amount : 0.00;
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          amount: userBal,
          balance: userBal,
          allwallets: userBal,
          userAmount: userBal,
          mainWallet: userBal,
          thirdWallet: 0.00, availableAmount: userBal, thidGameBalanceList: [{ vendorCode: 'Lottery', balance: userBal }]
        }
      }));
      return;
    }

    // VIP Endpoints
    if (endpoint.includes('GetVipUsers')) {
      const user = getActiveUser(req, true) || {
        nickName: "MemberNNGKZZD9"
      };
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          vipLevel: 1,
          exp: 150,
          nowExp: 150,
          maxExp: 1000,
          settlementDate: 15,
          userPhoto: "1",
          nickName: user?.nickName || "MemberNNGKZZD9"
        }
      }));
      return;
    }

    if (endpoint.includes('GetListVipLevel')) {
      const captured = path.join(__dirname, 'captured_api_responses', 'GetListVipLevel.json');
      if (fs.existsSync(captured)) {
        res.end(fs.readFileSync(captured, 'utf-8'));
        return;
      }
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { id: 1, name: "Upgrade Reward", description: "Each account can only claim once", integral: 100, balance: 60, rate: 0 },
          { id: 2, name: "Monthly Reward", description: "Each account can claim once a month", integral: 50, balance: 100, rate: 0 },
          { id: 3, name: "Recharge Reward", description: "Get rewards every recharge", integral: 0, balance: 0, rate: 0 },
          { id: 4, name: "Safe Box", description: "Extra interest rate in safe box", integral: 0, balance: 0, rate: 0.2 },
          { id: 5, name: "Wash Code Rate", description: "Extra rebate return for betting", integral: 0, balance: 0, rate: 0.4 }
        ]
      }));
      return;
    }

    if (endpoint.includes('GetListVipUserRewards')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { id: 1, rewardType: 1, balance: 60, integral: 100, status: 0, rate: 0 },
          { id: 2, rewardType: 2, balance: 100, integral: 50, status: 0, rate: 0 },
          { id: 3, rewardType: 5, balance: 0, integral: 0, status: 0, rate: 0.4 }
        ]
      }));
      return;
    }

    if (endpoint.includes('GetPageListVipUserRecord')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [],
          totalCount: 0
        }
      }));
      return;
    }

    // PointMall Endpoints
    if (endpoint.includes('GetBannerTypeList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          productTypeList: [
            { typeID: "1000", typeName: "Points Treasure" },
            { typeID: "1", typeName: "Digital" },
            { typeID: "2", typeName: "Luxury" }
          ]
        }
      }));
      return;
    }

    if (endpoint.includes('GetProductList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [
            {
              id: 1,
              productName: "Apple iPhone 15 Pro Max 256GB",
              productImg: "/assets/png/iphone.png",
              stock: 88,
              grandTotal: 342,
              integral: 80000
            },
            {
              id: 2,
              productName: "Apple Watch Ultra 2 Titanium",
              productImg: "/assets/png/watch.png",
              stock: 120,
              grandTotal: 560,
              integral: 45000
            },
            {
              id: 3,
              productName: "AirPods Pro (2nd Generation) USB-C",
              productImg: "/assets/png/airpods.png",
              stock: 250,
              grandTotal: 1120,
              integral: 18000
            },
            {
              id: 4,
              productName: "Sony PlayStation 5 Slim Console",
              productImg: "/assets/png/ps5.png",
              stock: 45,
              grandTotal: 215,
              integral: 55000
            }
          ],
          totalCount: 4
        }
      }));
      return;
    }

    if (endpoint.includes('GetPointsLotteryList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [
            {
              pointsLotteryID: 101,
              title: "Super Lucky Treasure Draw",
              integral: 100,
              productImg: "/assets/png/iphone.png",
              bannerUrl: "/dmfirst/banner/Banner_2026091313014259s9.png",
              totalCount: 1000,
              currentCount: 654
            }
          ],
          totalCount: 1
        }
      }));
      return;
    }

    if (endpoint.includes('GetProductOrderList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [
            {
              orderId: 1001,
              orderNumber: "PM202609300001",
              orderType: 1,
              productName: "Apple iPhone 15 Pro Max 256GB",
              productImg: "/assets/png/iphone.png",
              state: 2,
              counts: 1,
              integral: 80000,
              addTime: "2026-09-30 18:24:12"
            },
            {
              orderId: 1002,
              orderNumber: "PM202609250002",
              orderType: 1,
              productName: "AirPods Pro (2nd Generation) USB-C",
              productImg: "/assets/png/airpods.png",
              state: 2,
              counts: 1,
              integral: 18000,
              addTime: "2026-09-25 11:10:05"
            }
          ],
          totalCount: 2
        }
      }));
      return;
    }

    // DailySignIn Endpoints (Sequence: Day 1: ₹5, Day 2: ₹5, Day 3: ₹8, Day 4: ₹2, etc.)
    if (endpoint.includes('GetContinuousSignInRecharges')) {
      const user = getActiveUser(req) || getActiveUser(req, true) || { dailySignCount: 0 };
      const currentSignCount = user.dailySignCount || 0;
      const cycleDay = (currentSignCount % 7);
      const rewardPattern = [5.00, 5.00, 8.00, 2.00, 5.00, 5.00, 8.00];
      const rewardsList = rewardPattern.map((amt, idx) => ({
        day: idx + 1,
        bouns: amt,
        status: idx < cycleDay ? 1 : 0
      }));

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          signIn: {
            signCount: currentSignCount,
            signInSum: 0.00
          },
          signInRechargesList: rewardsList
        }
      }));
      return;
    }
    if (endpoint.includes('SetContinuousSinIn')) {
      const user = getActiveUser(req) || getActiveUser(req, true);
      if (user) {
        const count = user.dailySignCount || 0;
        const rewardPattern = [5.00, 5.00, 8.00, 2.00, 5.00, 5.00, 8.00];
        const todayBonus = rewardPattern[count % 7];
        user.amount = parseFloat(((user.amount || 0) + todayBonus).toFixed(2));
        user.dailySignCount = count + 1;
        saveUsers();
        console.log(`[Check-in] User ${user.number} checked in! Day ${(count % 7) + 1} reward: ₹${todayBonus}. New Balance: ₹${user.amount}`);
      }
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: true
      }));
      return;
    }

    // Suppress repeating task popups permanently
    if (endpoint.includes('GetCurrentActivityTasks') || endpoint.includes('GetTaskList') || endpoint.includes('GetTreasureChestPopupItems') || endpoint.includes('GetTreasureChestPopup') || endpoint.includes('GetRedpagePopup') || endpoint.includes('GetEventRewards')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: []
      }));
      return;
    }

    // Promotion & Referral System
    if (endpoint.includes('NewPromotion')) {
      const user = getActiveUser(req) || getActiveUser(req, true) || { userId: 1677637, number: "9068839558" };
      const code = `${user.userId}${user.number}`;
      const host = req.headers.host || 'localhost:3000';
      const mylink = `${getPublicOrigin(req)}/#/register?invitationCode=${code}`;
      const referrals = user.referrals || [];
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        msgCode: 0,
        data: {
          mylink,
          aglink: Buffer.from(code).toString('base64'),
          mycode: code,
          children_Lv_1_Count: referrals.length,
          children_Lv_Count_X: referrals.length,
          children_Lv_1_Count_Add: referrals.length,
          children_Lv_Count_X_Add: referrals.length,
          children_Lv_1_Count_Add_Yesterday: 0,
          children_Lv_Count_X_Add_Yesterday: 0,
          children_Lv_1_RechargesSumCount: 0,
          children_Lv_RechargesSumCount: 0,
          children_Lv_1_FirstRechargesCount: 0,
          children_Lv_FirstRechargesCount: 0,
          children_Lv_1_RechargesSumAmount: 0,
          children_Lv_RechargesSumAmount: 0,
          children_Lv_RebateAmount_Yesterday: 0,
          children_Lv_1_RebateAmount_Yesterday: 0,
          children_Lv_RebateAmount_Week: 0,
          children_Lv_1_RebateAmount_X_Yesterday: 0,
          children_Lv_RebateAmount: 0
        }
      }));
      return;
    }

    if (endpoint.includes('PromotionMytem') || endpoint.includes('GetPromotionRecord') || endpoint.includes('GetSubordinates') || endpoint.includes('GetPromotionMember')) {
      const user = getActiveUser(req) || getActiveUser(req, true) || { referrals: [] };
      const referrals = (user.referrals || []).map(r => ({
        userId: r.userId,
        userName: r.username,
        nickName: r.nickName || `User${r.userId}`,
        regTime: r.joinedAt,
        status: r.status || "New referral joined",
        amount: 0.00
      }));
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: referrals,
          total: referrals.length,
          totalCount: referrals.length
        }
      }));
      return;
    }

    // About & Protocols
    if (endpoint.includes('GetProtocols')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          protocols: `<div style="padding:15px;line-height:1.6;font-size:14px;color:rgba(255,255,255,0.85);">
            <h3 style="color:#f2da78;margin-bottom:12px;">Privacy Policy &amp; Security Protocols</h3>
            <p>1. <b>Data Protection:</b> We are committed to protecting our players' personal and financial privacy. All sensitive information transmitted between your client and our servers is secured using bank-grade 256-bit SSL encryption.</p>
            <p>2. <b>Account Responsibility:</b> Each player is solely responsible for maintaining the confidentiality of their login credentials, password, and financial details.</p>
            <p>3. <b>Fair Play Guarantee:</b> All games are governed by certified random number generators (RNG) to ensure transparent, unpredictable, and strictly fair game results at all times.</p>
            <p>4. <b>Customer Support:</b> Our professional customer service team operates 24/7 to resolve any queries regarding account management, transactions, and responsible gaming.</p>
          </div>`
        }
      }));
      return;
    }
    if (endpoint.includes('GetAgreement')) {
      const captured = path.join(__dirname, 'captured_api_responses', 'GetAgreement.json');
      if (fs.existsSync(captured)) {
        res.end(fs.readFileSync(captured, 'utf-8'));
        return;
      }
    }

    // Turntable Endpoints
    if (endpoint.includes('GetInvitedWheelRules')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: `<div style="padding:15px;line-height:1.6;font-size:14px;color:rgba(255,255,255,0.85);">
          <h3 style="color:#f2da78;margin-bottom:12px;">Lucky Wheel Rules</h3>
          <p>1. Invite friends to register and deposit to receive free spins on the Lucky Wheel.</p>
          <p>2. Each valid spin offers cash prizes and reward multipliers.</p>
          <p>3. Wheel winnings can be directly withdrawn to your registered payment method or used to play any game.</p>
        </div>`
      }));
      return;
    }
    if (endpoint.includes('GetInvitedWheelInfo')) {
      const user = getActiveUser(req) || getActiveUser(req, true) || { spinWheelChances: 1 };
      const chances = typeof user.spinWheelChances === 'number' ? user.spinWheelChances : 1;
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Succeed",
        msgCode: 0,
        data: {
          isOpenInvitedWheel: true,
          isFirstInvitedWheel: false,
          userInvitedWheelCount: chances,
          userInvitedWheelAmount: 0,
          invitedWheelTotalPrizeAmount: 500,
          invitedWheelAmountofcodeAmount: 0,
          expiredTime: "",
          diskDisplayAmount: [ 100, 25, 30, 35, 40, 45, 50 ],
          noWinningRandomAmount: [ 0, 10 ],
          lastWheelRecordList: []
        }
      }));
      return;
    }
    if (endpoint.includes('SpinInvitedWheel')) {
      const user = getActiveUser(req) || getActiveUser(req, true);
      let winAmt = 0;
      if (user && (user.spinWheelChances || 0) > 0) {
        user.spinWheelChances -= 1;
        winAmt = 25.00;
        user.amount = parseFloat(((user.amount || 0) + winAmt).toFixed(2));
        saveUsers();
      }
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          isWin: winAmt > 0,
          prizeAmount: winAmt,
          isFirstInvitedWheel: false,
          firstInvitedWheelDatas: []
        }
      }));
      return;
    }

    // Interactive external game bet/win wallet synchronization
    if (endpoint.includes('GameTransferOrBet')) {
      const user = getActiveUser(req, true);
      const delta = parseFloat(body.amount || 0);

      // The wallet delta must come from server-side state, never from a client
      // number. Accept a positive credit only when it references a bet this user
      // actually placed (orderNumber present, still pending) and the amount is the
      // bet's own payout; otherwise a player could mint any balance they like.
      let applied = false;
      if (user && Number.isFinite(delta)) {
        const orderNumber = String(body.orderNumber || body.orderNo || '');
        const pendingBet = orderNumber
          ? betStore.find(b => b.orderNumber === orderNumber && String(b.userId) === String(user.userId) && b.state === 0)
          : null;

        if (pendingBet && delta > 0) {
          await MongoUser.updateOne({ userId: user.userId }, { $inc: { amount: delta } });
          user.amount = parseFloat((user.amount + delta).toFixed(2));
          saveUsers();
          applied = true;
          console.log(`[GameTransferOrBet] Credited ₹${delta} for order ${orderNumber} (userId ${user.userId})`);
        } else {
          console.warn(`[GameTransferOrBet] REJECTED raw delta ₹${delta} (order "${orderNumber}") for userId ${user.userId}: no matching pending bet.`);
        }
      }

      const bal = (user && typeof user.amount === 'number') ? user.amount : 0.00;
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: applied ? 'success' : 'No matching pending bet; amount not applied',
        data: { balance: bal, amount: bal }
      }));
      return;
    }

    // GetBalance / GetAllwallets / GetARGameAndPlatWallets / GetBalanceByARGame
    if (endpoint.includes('GetBalance') || endpoint.includes('GetAllwallets') || endpoint.includes('GetSaasAllwallets') || endpoint.includes('GetARGameAndPlatWallets') || endpoint.includes('GetBalanceByARGame') || endpoint.includes('NotifyARGameRecover') || endpoint.includes('Transfer')) {
      await resolvePendingBets();
      const user = getActiveUser(req) || { amount: 0.00 };
      await refreshAmountFromDb(user);
      const bal = (typeof user.amount === 'number') ? user.amount : 0.00;
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          balance: bal,
          amount: bal,
          freezeBalance: 0,
          lotteryBalance: bal,
          totalBalance: bal,
          thidGameBalanceList: [
            { vendorCode: "Lottery", balance: bal }
          ]
        }
      }));
      return;
    }

    // WinGo & Lottery Issues
    if (endpoint.includes('GetGameIssue') || endpoint.includes('WinGoGetGameIssue') || endpoint.includes('GetTRXGameIssue') || endpoint.includes('GetGameK3Issue') || endpoint.includes('GetGame5DIssue')) {
      const typeId = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 1);
      const cfg = getGameConfigByTypeId(typeId);
      const intervalSec = cfg?.intervalSec || 60;
      
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();

      const issueSeq = Math.floor(totalSeconds / intervalSec) + 1;
      const issueNumber = `${dateStr}${String(issueSeq).padStart(4, '0')}`;
      const preIssueSeq = Math.max(1, issueSeq - 1);
      const preIssue = `${dateStr}${String(preIssueSeq).padStart(4, '0')}`;
      const passSeconds = totalSeconds % intervalSec;
      const remainingSec = intervalSec - passSeconds;

      const startTime = new Date(now.getTime() - passSeconds * 1000).toISOString().replace('T', ' ').slice(0, 19);
      const serviceTime = now.toISOString().replace('T', ' ').slice(0, 19);
      const endTime = new Date(now.getTime() + remainingSec * 1000).toISOString().replace('T', ' ').slice(0, 19);

      // Deterministic auto result from unified engine for the PREVIOUS round that ended
      const preLive = getUnifiedLiveResultForIssue(cfg?.key || typeId, preIssue);
      const preResultStr = String(preLive?.result ?? "7");
      const preDetails = preLive?.details || {};

      let colour = "green";
      let bs = "b";
      let premium = preResultStr;

      if (cfg?.type === 'k3_dice') {
        premium = preResultStr;
        const diceSum = preDetails.sum || preResultStr.split('').reduce((a, c) => a + Number(c), 0);
        bs = diceSum >= 11 ? "b" : "s";
      } else if (cfg?.type === '5d_digits') {
        premium = preResultStr;
        const dSum = preDetails.sum || preResultStr.split('').reduce((a, c) => a + Number(c), 0);
        bs = dSum >= 23 ? "b" : "s";
      } else {
        const num = parseInt(preResultStr);
        if (num === 0) colour = "red,violet";
        else if (num === 5) colour = "green,violet";
        else colour = (num % 2 === 0 ? "red" : "green");
        bs = (num >= 5 ? "b" : "s");
      }

      const baseIssue = {
        issueNumber,
        preIssue,
        startTime,
        serviceTime,
        endTime,
        remainingTime: remainingSec,
        seconds: remainingSec,
        lotteryTime: intervalSec,
        preResult: preResultStr,
        premium,
        number: preResultStr,
        colour,
        bs
      };

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          ...baseIssue,
          predraw: baseIssue,
          settled: []
        }
      }));
      return;
    }

    // Specialized Lottery Type Lists
    if (endpoint.includes('GetK3TypeList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeID: 9, typeId: 9, typeName: "K3 Lotre <br />1Min", tabName: "K3 1Min", intervalM: 1, scope: "1|10|100|1000", sort: 1, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "K3_1M", lottery: "K3" },
          { typeID: 10, typeId: 10, typeName: "K3 Lotre<br />3Min", tabName: "K3 3Min", intervalM: 3, scope: "1|10|100|1000", sort: 2, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "K3_3M", lottery: "K3" },
          { typeID: 11, typeId: 11, typeName: "K3 Lotre<br />5Min", tabName: "K3 5Min", intervalM: 5, scope: "1|10|100|1000", sort: 3, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "K3_5M", lottery: "K3" },
          { typeID: 12, typeId: 12, typeName: "K3 Lotre<br />10Min", tabName: "K3 10Min", intervalM: 10, scope: "1|10|100|1000", sort: 4, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "K3_10M", lottery: "K3" }
        ]
      }));
      return;
    }

    if (endpoint.includes('Get5DtypeList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeID: 5, typeId: 5, typeName: "5D<br />1Min", tabName: "5D 1Min", intervalM: 1, scope: "1|10|100|1000", sort: 1, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "5D_1M", lottery: "5D" },
          { typeID: 6, typeId: 6, typeName: "5D<br />3Min", tabName: "5D 3Min", intervalM: 3, scope: "1|10|100|1000", sort: 2, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "5D_3M", lottery: "5D" },
          { typeID: 7, typeId: 7, typeName: "5D<br />5Min", tabName: "5D 5Min", intervalM: 5, scope: "1|10|100|1000", sort: 3, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "5D_5M", lottery: "5D" },
          { typeID: 8, typeId: 8, typeName: "5D<br />10Min", tabName: "5D 10Min", intervalM: 10, scope: "1|10|100|1000", sort: 4, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "5D_10M", lottery: "5D" }
        ]
      }));
      return;
    }

    if (endpoint.includes('GetTRXtypeList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeID: 13, typeId: 13, typeName: "Trx Win Go<br />1Min", tabName: "TRX 1Min", intervalM: 1, scope: "1|10|100|1000", sort: 1, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "TRX_1M", lottery: "WinTrx" },
          { typeID: 14, typeId: 14, typeName: "Trx Win Go<br />3Min", tabName: "TRX 3Min", intervalM: 3, scope: "1|10|100|1000", sort: 2, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "TRX_3M", lottery: "WinTrx" },
          { typeID: 15, typeId: 15, typeName: "Trx Win Go<br />5Min", tabName: "TRX 5Min", intervalM: 5, scope: "1|10|100|1000", sort: 3, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "TRX_5M", lottery: "WinTrx" },
          { typeID: 16, typeId: 16, typeName: "Trx Win Go<br />10Min", tabName: "TRX 10Min", intervalM: 10, scope: "1|10|100|1000", sort: 4, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "TRX_10M", lottery: "WinTrx" }
        ]
      }));
      return;
    }

    // Default WinGo Type List
    if (endpoint.includes('GetTypeList') || endpoint.includes('WinGoGetTypeList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeID: 1, typeId: 1, typeName: "Win Go<br />1Min", tabName: "WinGo 1Min", intervalM: 1, scope: "1|10|100|1000", sort: 1, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_1M", lottery: "WinGo" },
          { typeID: 2, typeId: 2, typeName: "Win Go<br />3Min", tabName: "WinGo 3Min", intervalM: 3, scope: "1|10|100|1000", sort: 2, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_3M", lottery: "WinGo" },
          { typeID: 3, typeId: 3, typeName: "Win Go<br />5Min", tabName: "WinGo 5Min", intervalM: 5, scope: "1|10|100|1000", sort: 3, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_5M", lottery: "WinGo" },
          { typeID: 4, typeId: 4, typeName: "Win Go<br />10Min", tabName: "WinGo 10Min", intervalM: 10, scope: "1|10|100|1000", sort: 4, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_10M", lottery: "WinGo" },
          { typeID: 30, typeId: 30, typeName: "Win Go<br />30s", tabName: "WinGo 30s", intervalM: 0.5, scope: "1|10|100|1000", sort: 5, betMultiple: "1|5|10|20|50|100", show: true, state: 1, gameCode: "WinGo_30S", lottery: "WinGo" }
        ]
      }));
      return;
    }

    // Rules
    if (endpoint.includes('GetRule') || endpoint.includes('RuleByTypeId') || endpoint.includes('GetWinGoRule')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          gamePresentation: "1. Select Green, Red, or Purple to place a bet.\n2. Total countdown timer resets every round.\n3. Instant win calculations based on the winning ball outcome."
        }
      }));
      return;
    }

    // Long Dragon
    if (endpoint.includes('GetLongDragon') || endpoint.includes('LongDragon')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: []
      }));
      return;
    }

    // 5D Odds List
    if (endpoint.includes('Get5DOddsList') || endpoint.includes('OddsList')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { playID: 1, playType: 1, playBet: "0-9", playResult: "0-9", playRate: 9, playRate_Original: 9 },
          { playID: 2, playType: 2, playBet: "H", playResult: "H", playRate: 2, playRate_Original: 2 },
          { playID: 3, playType: 2, playBet: "L", playResult: "L", playRate: 2, playRate_Original: 2 },
          { playID: 4, playType: 3, playBet: "O", playResult: "O", playRate: 2, playRate_Original: 2 },
          { playID: 5, playType: 3, playBet: "E", playResult: "E", playRate: 2, playRate_Original: 2 }
        ]
      }));
      return;
    }

    // TRX Lottery History Results
    if (endpoint.includes('GetTRXNoaverageEmerdList') || endpoint.includes('WinTxrGetTRXNoaverageEmerdList')) {
      const typeId = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 13);
      const cfg = getGameConfigByTypeId(typeId);
      const intervalSec = cfg?.intervalSec || 60;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const seq = Math.floor(totalSeconds / intervalSec) + 1;
      const gameslist = [];
      for (let i = 1; i <= 10; i++) {
        const targetSeq = seq - i;
        if (targetSeq < 1) break;
        const targetIssue = `${dateStr}${String(targetSeq).padStart(4, '0')}`;
        const liveRes = getUnifiedLiveResultForIssue(cfg?.key || 'trx_wingo_1m', targetIssue);
        const num = parseInt(liveRes.result) % 10;
        let colour = (num % 2 === 0 ? "red" : "green");
        if (num === 0) colour = "red,violet";
        if (num === 5) colour = "green,violet";
        const bs = num >= 5 ? "b" : "s";
        gameslist.push({
          issueNumber: targetIssue,
          blockID: `0000000000000000000c8b21a37c4e51241f8796850c9521361cb61d4287c8d${num}`,
          number: num,
          colour,
          bs
        });
      }
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          date: { serviceTime: now.toISOString().replace('T', ' ').slice(0, 19) },
          gameslist,
          totalPage: 5,
          pageNo: 1
        }
      }));
      return;
    }

    // Trend Statistics & Chart (WinGo, 5D, etc.)
    if (endpoint.includes('GetEmerdList') || endpoint.includes('Get5DEmerdList') || endpoint.includes('GetTRXEmerdList')) {
      const trendStats = [
        { type: 1, type_Number: 1, number_0: 3, number_1: 8, number_2: 12, number_3: 1, number_4: 5, number_5: 0, number_6: 9, number_7: 2, number_8: 4, number_9: 6 },
        { type: 2, type_Number: 2, number_0: 10, number_1: 15, number_2: 8, number_3: 12, number_4: 9, number_5: 14, number_6: 11, number_7: 7, number_8: 13, number_9: 10 },
        { type: 3, type_Number: 3, number_0: 8, number_1: 12, number_2: 9, number_3: 14, number_4: 10, number_5: 11, number_6: 7, number_7: 15, number_8: 8, number_9: 13 },
        { type: 4, type_Number: 4, number_0: 2, number_1: 1, number_2: 3, number_3: 1, number_4: 2, number_5: 1, number_6: 2, number_7: 3, number_8: 1, number_9: 2 },
        { type: 5, type_Number: 5, number_0: 5, number_1: 4, number_2: 6, number_3: 5, number_4: 3, number_5: 4, number_6: 6, number_7: 5, number_8: 4, number_9: 5 }
      ];
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: trendStats
      }));
      return;
    }

    // My Personal Bets / Bet History — returns real stored bets
    if (endpoint.includes('GetMyEmerdList') || endpoint.includes('GetMy5DEmerdList') || endpoint.includes('GetMyK3EmerdList') || endpoint.includes('GetTRXMyEmerdList') || endpoint.includes('WinTxrGetTRXMyEmerdList') || endpoint.includes('GetMy4DHistoryBetting') || endpoint.includes('GetNewMyEmerdList')) {
      await resolvePendingBets();
      const me = getActiveUser(req, true);
      if (!me) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 4, result: false, msg: 'Authentication required', msgCode: 4 }));
        return;
      }
      // Scope to THIS user only (the previous code returned every player's bets).
      const myBets = betStore
        .filter(b => b.userNumber === me.number || String(b.userId) === String(me.userId))
        .slice(-20)
        .reverse()
        .map(bet => ({
        selectType: bet.selectType,
        issueNumber: bet.issueNumber,
        addTime: bet.addTime,
        profitAmount: bet.profitAmount,
        winAmount: bet.winAmount,
        state: bet.state,
        orderNumber: bet.orderNumber,
        amount: bet.amount,
        betCount: bet.betCount,
        realAmount: bet.realAmount,
        fee: bet.fee,
        premium: bet.premium || bet.number || "",
        number: bet.number || "",
        colour: bet.colour || "",
        bs: bet.bs || "",
        gameType: bet.gameType || 1
      }));

      // Fallback sample data if no real bets yet
      const fallback = myBets.length > 0 ? myBets : [
        {
          selectType: "13",
          issueNumber: "20261001",
          addTime: new Date(Date.now() - 60000).toISOString().replace('T', ' ').slice(0, 19),
          profitAmount: 19.6,
          winAmount: 19.6,
          state: 1,
          orderNumber: "ORD_SAMPLE_1",
          amount: 10,
          betCount: 1,
          realAmount: 9.8,
          fee: 0.2,
          premium: "7",
          number: "7",
          colour: "green",
          bs: "b",
          gameType: 1
        },
        {
          selectType: "11",
          issueNumber: "20261001",
          addTime: new Date(Date.now() - 120000).toISOString().replace('T', ' ').slice(0, 19),
          profitAmount: 19.6,
          winAmount: 19.6,
          state: 1,
          orderNumber: "ORD_SAMPLE_2",
          amount: 10,
          betCount: 1,
          realAmount: 9.8,
          fee: 0.2,
          premium: "7",
          number: "7",
          colour: "green",
          bs: "b",
          gameType: 1
        }
      ];
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: fallback,
          totalPage: Math.ceil(fallback.length / 10) || 1,
          pageNo: 1
        },
        list: fallback,
        totalPage: Math.ceil(fallback.length / 10) || 1,
        pageNo: 1
      }));
      return;
    }

    // Lottery History Results (WinGo, 5D, K3)
    if (endpoint.includes('GetNoaverageEmerdList') || endpoint.includes('GetNoaverage5DEmerdList') || endpoint.includes('GetK3NoaverageEmerdList') || endpoint.includes('GetHistoryIssuePage')) {
      const typeId = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 1);
      const cfg = getGameConfigByTypeId(typeId);
      const intervalSec = cfg?.intervalSec || 60;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const seq = Math.floor(totalSeconds / intervalSec) + 1;
      
      const history = [];
      // Clamp both paging parameters so a negative pageNo can no longer point the
      // loop at future issues (which would leak the deterministic result that
      // settlement later uses).
      const pageSize = Math.min(50, Math.max(1, parseInt(body.pageSize || parsedUrl.searchParams.get('pageSize') || 10) || 10));
      const pageNo = Math.max(1, parseInt(body.pageNo || parsedUrl.searchParams.get('pageNo') || 1) || 1);
      const offset = (pageNo - 1) * pageSize;

      for (let i = 1; i <= pageSize; i++) {
        const targetSeq = seq - offset - i;
        if (targetSeq < 1) break;
        // Never emit a round that has not ended yet.
        if (targetSeq >= seq) continue;
        const targetIssue = `${dateStr}${String(targetSeq).padStart(4, '0')}`;
        const liveRes = getUnifiedLiveResultForIssue(cfg?.key || typeId, targetIssue);
        const resStr = String(liveRes.result);
        const details = liveRes.details || {};

        if (cfg?.type === 'k3_dice') {
          const sum = details.sum || resStr.split('').reduce((a, c) => a + Number(c), 0);
          const bs = sum >= 11 ? "b" : "s";
          history.push({
            issueNumber: targetIssue,
            number: resStr,
            colour: "k3",
            premium: resStr,
            block: resStr,
            bs,
            sumCount: sum,
            amount: 10,
            state: 1
          });
        } else if (cfg?.type === '5d_digits') {
          const sum = details.sum || resStr.split('').reduce((a, c) => a + Number(c), 0);
          const bs = sum >= 23 ? "b" : "s";
          history.push({
            issueNumber: targetIssue,
            number: resStr[0] || "0",
            colour: "5d",
            premium: resStr,
            block: resStr,
            bs,
            sumCount: sum,
            amount: 10,
            state: 1
          });
        } else {
          // WinGo / TRX
          const num = parseInt(resStr);
          let colour = (num % 2 === 0 ? "red" : "green");
          if (num === 0) colour = "red,violet";
          if (num === 5) colour = "green,violet";
          const bs = num >= 5 ? "b" : "s";
          history.push({
            issueNumber: targetIssue,
            number: num,
            colour,
            premium: String(num),
            block: String(num),
            bs,
            amount: 10,
            state: 1,
            sumCount: num
          });
        }
      }

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: history,
          totalPage: 5,
          pageNo
        },
        list: history,
        totalPage: 5,
        pageNo
      }));
      return;
    }

    // 5D / K3 One Emerd
    if (endpoint.includes('Get5DOneEmerd')) {
      const typeId = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 5);
      const cfg = getGameConfigByTypeId(typeId);
      const intervalSec = cfg?.intervalSec || 60;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const issueSeq = Math.floor(totalSeconds / intervalSec) + 1;
      const preIssue = `${dateStr}${String(Math.max(1, issueSeq - 1)).padStart(4, '0')}`;

      const live5D = getUnifiedLiveResultForIssue(cfg?.key || '5d_1m', preIssue);
      let premium5D = String(live5D?.result || "64321");
      const sum = premium5D.split('').reduce((a, c) => a + (parseInt(c) || 0), 0);
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: { premium: premium5D, sumCount: sum }
      }));
      return;
    }

    if (endpoint.includes('GetK3OneEmerd')) {
      const typeId = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 9);
      const cfg = getGameConfigByTypeId(typeId);
      const intervalSec = cfg?.intervalSec || 60;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const issueSeq = Math.floor(totalSeconds / intervalSec) + 1;
      const preIssue = `${dateStr}${String(Math.max(1, issueSeq - 1)).padStart(4, '0')}`;

      const liveK3 = getUnifiedLiveResultForIssue(cfg?.key || 'k3_1m', preIssue);
      let premiumK3 = String(liveK3?.result || "345");
      const sum = premiumK3.split('').reduce((a, c) => a + (parseInt(c) || 0), 0);
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: { premium: premiumK3, sumCount: sum }
      }));
      return;
    }

    // Winning Result Checks — resolves pending bets and returns win/loss popup data
    if (endpoint.includes('GetWinTheLotteryResult') || endpoint.includes('GetTrxWinTheLotteryResult') || endpoint.includes('GetK3TheLotteryResult') || endpoint.includes('GetD5TheLotteryResult') || endpoint.includes('GetWinLossResult')) {
      const requestedIssues = Array.isArray(body.issueNumber) ? body.issueNumber.map(String) : (body.issueNumber ? [String(body.issueNumber)] : []);

      // 1. Resolve pending bets
      resolvePendingBets(requestedIssues);

      // 2. Collect resolved results
      const resolvedResults = [];
      const user = getActiveUser(req, false);
      const userPhone = user ? (user.number || null) : null;

      for (let i = betStore.length - 1; i >= 0; i--) {
        const bet = betStore[i];
        const isQueried = requestedIssues.length > 0 && requestedIssues.includes(String(bet.issueNumber));
        if (isQueried || (requestedIssues.length === 0 && (bet.userNumber === userPhone || !bet.userNumber))) {
          resolvedResults.push(mapBetForUi(bet));
          if (resolvedResults.length >= 10) break;
        }
      }

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: resolvedResults
      }));
      return;
    }

    // Lottery User Records / History Page
    if (endpoint.includes('GetRecordPage') || endpoint.includes('GetMyHistoryBet') || endpoint.includes('GetPageListUserBet')) {
      const user = getActiveUser(req, true);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 4, result: false, msg: 'Authentication required', msgCode: 4 }));
        return;
      }
      const userPhone = user.number || null;
      const list = betStore.filter(b => b.userNumber === userPhone || String(b.userId) === String(user.userId)).slice(-20).reverse().map(mapBetForUi);
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list,
          pageNo: 1,
          pageSize: 20,
          totalPage: 1,
          totalCount: list.length
        }
      }));
      return;
    }

    // Site Messages & Notifications
    if (endpoint.includes('GetSiteMessageList') || endpoint.includes('GetMessageList') || endpoint.includes('GetSitePopMsgList') || endpoint.includes('GetSiteMessage')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          list: [
            {
              id: 1,
              title: "Welcome to DMFirst Entertainment!",
              content: "Enjoy all lottery games and exciting features on DMFirst.",
              addTime: "2026-10-01 12:00:00"
            }
          ],
          total: 1
        }
      }));
      return;
    }

    // Last Five Results
    if (endpoint.includes('GetLastFiveIssueNumberResult')) {
      const typeId = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 1);
      const cfg = getGameConfigByTypeId(typeId);
      const intervalSec = cfg?.intervalSec || 60;
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const seq = Math.floor(totalSeconds / intervalSec) + 1;

      const lastFive = [];
      for (let i = 1; i <= 5; i++) {
        const targetSeq = seq - i;
        if (targetSeq < 1) break;
        const targetIssue = `${dateStr}${String(targetSeq).padStart(4, '0')}`;
        const liveRes = getUnifiedLiveResultForIssue(cfg?.key || typeId, targetIssue);
        const num = parseInt(liveRes.result);
        lastFive.push(isNaN(num) ? 7 : num);
      }

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          number: lastFive.join(','),
          list: lastFive
        }
      }));
      return;
    }

    // Game Betting (Placing Bets: WinGo, TrxWinGo, K3, 5D, MotoRace)
    if (endpoint.includes('WinGoBet') || endpoint.includes('VideoWinGoBet') || endpoint.includes('TrxWinGoBet') || endpoint.includes('K3Bet') || endpoint.includes('D5Bet') || endpoint.includes('MotoRaceBet') || endpoint.includes('GameBetting') || endpoint.includes('Betting') || endpoint === '/api/wingo/bet') {
      const user = getActiveUser(req, true);
      if (!user) {
        res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          code: 4,
          result: false,
          msg: "Authentication required to place bets.",
          msgCode: 4
        }));
        return;
      }

      const betAmt = Number(body.amount || 10) * Number(body.betCount || 1);
      if (isNaN(betAmt) || betAmt <= 0) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          code: 106,
          result: false,
          msg: "Invalid bet amount.",
          msgCode: 106
        }));
        return;
      }

      const fee = parseFloat((betAmt * 0.02).toFixed(2));
      const realAmt = parseFloat((betAmt - fee).toFixed(2));

      // Enforce strict balance check: block bet if wallet balance is less than bet amount
      if (user.amount < betAmt) {
        const currentBal = (typeof user.amount === 'number') ? user.amount : 0.00;
        console.log(`[BET BLOCKED] Insufficient balance for user ${user.number}: Wallet ₹${currentBal} < Required Bet ₹${betAmt}`);
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
          code: 105,
          result: false,
          msg: "Insufficient wallet balance! Please recharge.",
          msgCode: 105,
          data: {
            balance: currentBal
          }
        }));
        return;
      }

      user.amount = parseFloat((user.amount - betAmt).toFixed(2));
      saveUsers();

      const tid = parseInt(body.typeId || body.typeID || parsedUrl.searchParams.get('typeId') || parsedUrl.searchParams.get('typeID') || 1);
      const cfg = getGameConfigByTypeId(tid);
      const intervalSec = cfg?.intervalSec || 60;

      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const issueSeq = Math.floor(totalSeconds / intervalSec) + 1;
      
      // Bind the bet to the SERVER's current round. A client-supplied issueNumber
      // would let a player attach a bet to a round whose outcome they already know
      // (past results are public, and future ones are deterministic), so it is
      // ignored here.
      const issueNumber = `${dateStr}${String(issueSeq).padStart(4, '0')}`;
      const rawSelect = body.selecttype !== undefined ? body.selecttype : (body.selectType !== undefined ? body.selectType : (body.betCode !== undefined ? body.betCode : '11'));
      const selectType = String(rawSelect);
      const orderNumber = "ORD" + Date.now() + Math.floor(Math.random() * 1000);

      const userPhone = user.number || null;

      // Store pending bet
      betStore.push({
        orderNumber,
        issueNumber,
        userNumber: userPhone,
        userId: user.userId,
        gameType: body.gameType !== undefined ? body.gameType : 1,
        typeId: tid,
        gameKey: cfg?.key || 'wingo_1m',
        typeName: cfg?.name || "Win Go",
        selectType,
        amount: betAmt,
        realAmount: realAmt,
        fee,
        betCount: Number(body.betCount || 1),
        number: "",
        colour: "",
        bs: "",
        premium: "",
        addTime: now.toISOString().replace('T', ' ').slice(0, 19),
        state: 0, // pending
        profitAmount: 0,
        winAmount: 0,
        intervalSec
      });
      // Keep the store bounded WITHOUT dropping unresolved bets — their stake has
      // already been taken and they must still settle (or be refunded) later.
      if (betStore.length > 200) {
        const pending = betStore.filter(b => b.state === 0);
        const resolved = betStore.filter(b => b.state !== 0).slice(-Math.max(0, 200 - pending.length));
        betStore = pending.concat(resolved);
      }
      saveBets();

      console.log(`[BET PLACED] Order: ${orderNumber} | User: ${userPhone} | Issue: ${issueNumber} | Bet: ₹${betAmt} on Select: ${selectType} | Game: ${cfg?.key || 'wingo_1m'} | Remaining Balance: ₹${user.amount}`);

      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "Bet placed successfully!",
        msgCode: 0,
        data: {
          orderNumber,
          issueNumber,
          amount: betAmt,
          balance: user.amount
        }
      }));
      return;
    }

    // Recharge Channels
    if (endpoint.includes('GetRechargeTypes') || endpoint.includes('GetLocalRechargeTypes')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { typeId: 1, typeName: "UPI-QR", minAmount: 100, maxAmount: 50000, bonusRate: 5 },
          { typeId: 2, typeName: "Paytm Fast", minAmount: 200, maxAmount: 50000, bonusRate: 3 },
          { typeId: 3, typeName: "USDT-TRC20", minAmount: 1000, maxAmount: 1000000, bonusRate: 8 }
        ]
      }));
      return;
    }


    // GetAllowBetSetting (Allows opening and playing all games without recharge restriction)
    if (endpoint.includes('GetAllowBetSetting')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          allowNoRechargeGame: "1",
          canDirectToGame: true,
          userRechargeTimes: 1,
          userRechargeAmount: 1000.0,
          lowestRechargeAmountToGame: 0
        }
      }));
      return;
    }

    // Daily Profit Rank & Win Info (official dmfirst1.com style)
    if (endpoint.includes('GetDailyProfitRank')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          dataList: [
            { userName: "Mem***9823", amount: "₹18,500.00", userPhoto: "/assets/png/1-CeaUjM0-.png" },
            { userName: "Mem***5412", amount: "₹12,400.00", userPhoto: "/assets/png/2-DT-nKqf8.png" },
            { userName: "Mem***3319", amount: "₹9,800.00", userPhoto: "/assets/png/3-Dov4f59C.png" },
            { userName: "Mem***7701", amount: "₹6,500.00", userPhoto: "/assets/png/4-CPtZ_7z-.png" },
            { userName: "Mem***1245", amount: "₹4,200.00", userPhoto: "/assets/png/5-CXVnK6yV.png" }
          ],
          penarikanList: [
            { userName: "Mem***9823", amount: "₹18,500.00", userPhoto: "/assets/png/1-CeaUjM0-.png" },
            { userName: "Mem***5412", amount: "₹12,400.00", userPhoto: "/assets/png/2-DT-nKqf8.png" },
            { userName: "Mem***3319", amount: "₹9,800.00", userPhoto: "/assets/png/3-Dov4f59C.png" }
          ]
        }
      }));
      return;
    }

    // Slots Vendors with child games (external games removed)
    if (endpoint.includes('GetElectronWithChildGame')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: []
      }));
      return;
    }

    // Video Casino Vendors with child games (external games removed)
    if (endpoint.includes('GetVideWithChildGame')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: []
      }));
      return;
    }

    // Third-party Game Launch URL — redirect local games, disable external
    if (endpoint.includes('GetGameUrl')) {
      const gc = (body.gameCode || parsedUrl.searchParams.get('gameCode') || '').toLowerCase();
      const localGameMap = {
        'chicken-road':  '/games/chicken-road/',
        'chicken-road-2':'/games/chicken-road-2/',
        'aviator':       '/games/aviator/',
        'mega-block':    '/games/mega-block/',
        'tower-dash':    '/games/tower-dash/'
      };
      if (localGameMap[gc]) {
        // Hand the game the caller's own session in its launch URL. The game page
        // then always knows which wallet to read, even when the platform's
        // localStorage is unavailable (fresh tab, WebView/APK, cleared storage) —
        // which is what made the in-game wallet sit at 0.00 while the platform
        // wallet still showed a balance. The token is the player's own, travels
        // inside their own launch URL, and expires with their session.
        let launchUrl = localGameMap[gc];
        let launchToken = String(
          (req.headers && (req.headers['authorization'] || req.headers['x-auth-token'] || req.headers['token'])) || ''
        ).replace(/^Bearer\s+/i, '').trim();
        if (!launchToken && req.url) {
          try {
            const u = new URL(req.url, 'http://localhost');
            launchToken = u.searchParams.get('token') || u.searchParams.get('auth_token') || '';
          } catch (e) {}
        }
        if (launchToken) {
          try {
            jwt.verify(launchToken, JWT_SECRET); // never forward an unverifiable token
            launchUrl += (launchUrl.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(launchToken);
          } catch (e) {
            console.warn(`[game] launch token rejected for ${gc}: ${e.message}`);
          }
        }
        res.end(JSON.stringify({
          code: 0,
          result: true,
          msg: 'success',
          data: {
            url: launchUrl,
            jumpUrl: launchUrl,
            gameType: 99,
            isLocal: true
          }
        }));
      } else {
        res.end(JSON.stringify({
          code: 1,
          result: false,
          msg: 'Third-party external games are disabled',
          data: null
        }));
      }
      return;
    }

    // Third-party game lists / mini games (external games removed)
    if (endpoint.includes('GetThirdGameList') || endpoint.includes('GetSmallGameOrFishList') || endpoint.includes('GetThirdGameCategory')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          gameLists: []
        }
      }));
      return;
    }

    // Customer Service
    if (endpoint.includes('CustomerService') || endpoint.includes('GetSelfCustomerServiceLink')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          url: "https://telegram.org",
          link: "https://telegram.org",
          list: [
            { serviceName: "Live Support 24/7", link: "https://telegram.org" }
          ]
        }
      }));
      return;
    }

    // App Download & Config
    if (endpoint.includes('GetAppDownloadUrl') || endpoint.includes('GetAppDownloadConfigList') || endpoint.includes('GetHomeWebSite')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          appDownloadUrl: "/downloadCenter",
          latestAppVersion: "1.0.0",
          updateType: 0
        }
      }));
      return;
    }

    // Game Category List — Lottery + Featured Games
    if (endpoint.includes('GetGameCategoryList') || endpoint.includes('GetLotteryCategoryList')) {
      const list = [
        {
          id: 1,
          categoryCode: "lottery",
          typeNameCode: 9301,
          categoryName: "Lottery",
          categoryImg: "/dmfirst/gamecategory/gamecategory_2026082817582823w7.svg",
          sort: 1,
          state: 1
        },
        {
          id: 10,
          categoryCode: "featured",
          typeNameCode: 9310,
          categoryName: "Games",
          categoryImg: "/dmfirst/gamecategory/gamecategory_20260828175833g01z.svg",
          sort: 2,
          state: 1
        }
      ];
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: list,
        gameTypeList: list
      }));
      return;
    }

    // All Games List — ONLY internal Lottery games
    if (endpoint.includes('GetAllGameList')) {
      const allData = {
  "lottery": [
    {
      "id": 1,
      "name": "Win Go",
      "gameName": "Win Go",
      "gameNameEn": "Win Go",
      "slotsName": "Win Go",
      "categoryCode": "Win Go",
      "categoryName": "Win Go",
      "state": 1,
      "sort": 0,
      "categoryImg": "/dmfirst/lotterycategory/lotterycategory_20260828124739i4t5.png",
      "typeId": 1
    },
    {
      "id": 2,
      "name": "K3",
      "gameName": "K3",
      "gameNameEn": "K3",
      "slotsName": "K3",
      "categoryCode": "K3",
      "categoryName": "K3",
      "state": 1,
      "sort": 0,
      "categoryImg": "/dmfirst/lotterycategory/lotterycategory_20260828124618bdoa.png",
      "typeId": 9
    },
    {
      "id": 3,
      "name": "5D",
      "gameName": "5D",
      "gameNameEn": "5D",
      "slotsName": "5D",
      "categoryCode": "5D",
      "categoryName": "5D",
      "state": 1,
      "sort": 0,
      "categoryImg": "/dmfirst/lotterycategory/lotterycategory_2026082812462757nw.png",
      "typeId": 5
    },
    {
      "id": 4,
      "name": "Trx Win Go",
      "gameName": "Trx Win Go",
      "gameNameEn": "Trx Win Go",
      "slotsName": "Trx Win Go",
      "categoryCode": "Trx Win Go",
      "categoryName": "Trx Win Go",
      "state": 1,
      "sort": 0,
      "categoryImg": "/dmfirst/lotterycategory/lotterycategory_20260828124639ur91.png",
      "typeId": 13
    },
    {
      "id": 9,
      "name": "MotoRace",
      "gameName": "MotoRace",
      "gameNameEn": "MotoRace",
      "slotsName": "MotoRace",
      "categoryCode": "MotoRace",
      "categoryName": "MotoRace",
      "state": 1,
      "sort": 0,
      "categoryImg": "/dmfirst/lotterycategory/lotterycategory_20260828124653sgg9.png",
      "typeId": 17
    }
  ],
  "featured": [
    {
      "id": 101,
      "name": "Chicken Road",
      "gameName": "Chicken Road",
      "gameNameEn": "Chicken Road",
      "slotsName": "Chicken Road",
      "categoryCode": "featured",
      "categoryName": "Games",
      "state": 1,
      "sort": 1,
      "categoryImg": "/games/chicken-road/static/image/finish_bg.1af355ce.png",
      "imgUrl": "/games/chicken-road/static/image/finish_bg.1af355ce.png",
      "vendorImg": "/games/chicken-road/static/image/finish_bg.1af355ce.png",
      "gameCode": "chicken-road",
      "gameType": 99,
      "jumpUrl": "/games/chicken-road/"
    },
    {
      "id": 102,
      "name": "Chicken Road 2",
      "gameName": "Chicken Road 2",
      "gameNameEn": "Chicken Road 2",
      "slotsName": "Chicken Road 2",
      "categoryCode": "featured",
      "categoryName": "Games",
      "state": 1,
      "sort": 2,
      "categoryImg": "/games/chicken-road-2/static/image/chicken-road-bg.0ddd04b8.png",
      "imgUrl": "/games/chicken-road-2/static/image/chicken-road-bg.0ddd04b8.png",
      "vendorImg": "/games/chicken-road-2/static/image/chicken-road-bg.0ddd04b8.png",
      "gameCode": "chicken-road-2",
      "gameType": 99,
      "jumpUrl": "/games/chicken-road-2/"
    },
    {
      "id": 103,
      "name": "Aviator",
      "gameName": "Aviator",
      "gameNameEn": "Aviator",
      "slotsName": "Aviator",
      "categoryCode": "featured",
      "categoryName": "Games",
      "state": 1,
      "sort": 3,
      "categoryImg": "/dmfirst/gamelogo/SPRIBE/aviator.png",
      "imgUrl": "/dmfirst/gamelogo/SPRIBE/aviator.png",
      "vendorImg": "/dmfirst/gamelogo/SPRIBE/aviator.png",
      "gameCode": "aviator",
      "gameType": 99,
      "jumpUrl": "/games/aviator/"
    },
    {
      "id": 104,
      "name": "Mega Block Empire",
      "gameName": "Mega Block Empire",
      "gameNameEn": "Mega Block Empire",
      "slotsName": "Mega Block Empire",
      "categoryCode": "featured",
      "categoryName": "Games",
      "state": 1,
      "sort": 4,
      "categoryImg": "/assets/png/mega_block_empire.png",
      "imgUrl": "/assets/png/mega_block_empire.png",
      "vendorImg": "/assets/png/mega_block_empire.png",
      "gameCode": "mega-block",
      "gameType": 99,
      "jumpUrl": "/games/mega-block/"
    },
    {
      "id": 105,
      "name": "Tower Dash",
      "gameName": "Tower Dash",
      "gameNameEn": "Tower Dash",
      "slotsName": "Tower Dash",
      "categoryCode": "featured",
      "categoryName": "Games",
      "state": 1,
      "sort": 5,
      "categoryImg": "/assets/png/tower_dash.png",
      "imgUrl": "/assets/png/tower_dash.png",
      "vendorImg": "/assets/png/tower_dash.png",
      "gameCode": "tower-dash",
      "gameType": 99,
      "jumpUrl": "/games/tower-dash/"
    }
  ],
  "popular": {
    "platformList": [],
    "clicksTopList": []
  },
  "sport": [],
  "video": [],
  "slot": [],
  "chess": [],
  "fish": [],
  "flash": [],
  "awardRecordList": [],
  "featureGame": []
};
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: allData
      }));
      return;
    }

    // Manufacturer/Provider list → return empty so section is hidden
    if (endpoint.includes('GetManufacturerList') || endpoint.includes('GetPlatformList') || endpoint.includes('GetProviderList')) {
      res.end(JSON.stringify({ code: 0, result: true, msg: "success", data: [] }));
      return;
    }

    // Banners (official dmfirst1.com)
    if (endpoint.includes('GetBannerList') || endpoint.includes('GetBanner')) {
      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: [
          { bannerUrl: "/dmfirst/banner/Banner_2026091313014259s9.png", url: "" },
          { bannerUrl: "/dmfirst/banner/Banner_20260913130127tume.png", url: "" },
          { bannerUrl: "/dmfirst/banner/Banner_202609131301132qwx.png", url: "" },
          { bannerUrl: "/dmfirst/banner/Banner_20260913130049286d.png", url: "" }
        ]
      }));
      return;
    }

    // Check if we have captured response from live site
    const apiName = endpoint.split('/').pop();
    const capturedFile = path.join(__dirname, 'captured_api_responses', `${apiName}.json`);
    if (fs.existsSync(capturedFile)) {
      try {
        const capturedData = fs.readFileSync(capturedFile, 'utf-8');
        res.end(capturedData);
        return;
      } catch (e) {}
    }

    // Money mutation endpoints that are NOT implemented must never report success.
    // A success mock here would tell the player their withdrawal went through while
    // nothing was debited or recorded.
    if (endpoint.includes('Withdrawal') || endpoint.includes('SetWithdraw') || endpoint.includes('Withdraw')) {
      res.end(JSON.stringify({
        code: 1,
        result: false,
        msg: 'Withdrawal is not available on this server.',
        data: null
      }));
      return;
    }

    // Default universal success mock for all other APIs
    res.end(JSON.stringify({
      code: 0,
      result: true,
      msg: "success",
      data: {
        list: [],
        totalCount: 0
      }
    }));
    return;
  }


  // 3. Static File Serving with Game Asset Resolution & SPA routing
  if (reqPath === '/') reqPath = '/index.html';
  let filePath = safeStaticPath(reqPath);
  if (!filePath) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
    return;
  }

  // Check if request is from a game via Referer header
  const referer = req.headers.referer || '';
  let refererSlug = '';
  const refMatch = referer.match(/\/games\/([a-zA-Z0-9_\-]+)/);
  if (refMatch) {
    refererSlug = refMatch[1];
  }

  // Handle /static/ requests (from chicken-road, chicken-road-2, etc.)
  if (reqPath.startsWith('/static/')) {
    const candidates = [];
    if (refererSlug) candidates.push(safeStaticPath('/games/' + refererSlug + reqPath));
    candidates.push(safeStaticPath('/games/chicken-road-2' + reqPath));
    candidates.push(safeStaticPath('/games/chicken-road' + reqPath));
    for (const cand of candidates) {
      if (cand && fs.existsSync(cand)) {
        filePath = cand;
        break;
      }
    }
  }

  // If file doesn't exist at root, check if referer points to a game directory
  if (refererSlug) {
    const gameCandidate = safeStaticPath('/games/' + refererSlug + reqPath);
    if (gameCandidate && fs.existsSync(gameCandidate) && !fs.existsSync(filePath)) {
      filePath = gameCandidate;
    }
  }

  // If path doesn't exist, check extension
  if (!fs.existsSync(filePath)) {
    if (fs.existsSync(filePath + '.html')) {
      filePath = filePath + '.html';
    } else if (fs.existsSync(path.join(filePath, 'index.html'))) {
      filePath = path.join(filePath, 'index.html');
    } else if (reqPath.startsWith('/assets/') || reqPath.startsWith('/dmfirst/')) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.webp') {
        const fallbackPath = path.join(PUBLIC_DIR, 'assets', 'png', 'gift-CowApwMN.png');
        if (fs.existsSync(fallbackPath)) {
          res.writeHead(200, { 'Content-Type': 'image/png' });
          fs.createReadStream(fallbackPath).pipe(res);
          return;
        }
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
        return;
      }
      if (ext === '.svg') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#f2da78"/></svg>');
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    } else {
      const ext = path.extname(filePath).toLowerCase();
      // For code, media, font and data files, return 404 instead of returning index.html
      if (['.js', '.mjs', '.css', '.json', '.wasm', '.png', '.jpg', '.jpeg', '.svg', '.webp', '.ttf', '.woff', '.woff2', '.mp3', '.wav', '.ogg'].includes(ext)) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end(`404 Not Found: ${reqPath}`);
        return;
      }
      // SPA Fallback for client-side routing
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const headers = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*'
    };

    if (filePath.endsWith('.br')) {
      headers['Content-Encoding'] = 'br';
      if (filePath.endsWith('.wasm.br')) headers['Content-Type'] = 'application/wasm';
      else if (filePath.endsWith('.js.br')) headers['Content-Type'] = 'application/javascript; charset=utf-8';
      else if (filePath.endsWith('.data.br')) headers['Content-Type'] = 'application/octet-stream';
    } else if (ext === '.wasm') {
      headers['Content-Type'] = 'application/wasm';
    }

    res.writeHead(200, headers);

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
}

// ── Centralized Aviator WebSocket Server ──────────────────────────────────────
const wss = new WebSocketServer({ server, path: '/aviator-ws' });

// 30s heartbeat: terminate sockets that miss a pong so dead connections cannot
// accumulate in the client set and broadcast buffers.
const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      aviatorEngine.clients.delete(ws);
      continue;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (e) {}
  }
}, 30000);
wss.on('close', () => clearInterval(heartbeat));

wss.on('connection', (ws, req) => {
  ws.isAlive = true;
  ws.activeBets = {};
  ws.dmUserId = null;

  // Bind the socket to an authenticated user when a token is supplied. The token
  // may arrive in the query string or the first login message (the engine also
  // verifies the message token itself).
  try {
    const u = new URL(req.url, 'http://localhost');
    const token = u.searchParams.get('token') || u.searchParams.get('auth_token');
    if (token) ws.dmUserId = resolveAviatorUserId(token);
  } catch (e) {}

  aviatorEngine.clients.add(ws);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.send(JSON.stringify({ type: "connection", success: true }));

  ws.on('message', (message) => {
    ws.isAlive = true;
    aviatorEngine.handleClientMessage(ws, message.toString());
  });

  ws.on('close', () => {
    aviatorEngine.clients.delete(ws);
  });

  ws.on('error', () => {
    aviatorEngine.clients.delete(ws);
  });
});

async function startServer() {
  try {
    await connectDatabase();
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`[SERVER] Listening on port ${PORT}`);
      console.log(`[SERVER] Serving static frontend from ${PUBLIC_DIR}`);
    });
  } catch (error) {
    console.error(`[DB] MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
}

startServer();
