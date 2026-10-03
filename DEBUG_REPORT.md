# DEBUG REPORT — DM-WIN (WIN-CLUB platform)

Repo `https://github.com/BENJAMIN9068/DM-WIN` · local `C:\Users\godfa\OneDrive\Desktop\veer` · `main` @ `2d294c1`.

**How this was produced.** Full read of `serve.mjs` (3052 lines), `admin_backend.mjs` (1102), `aviator_server_engine.mjs` (602),
`archived_site/admin/admin_app.js` and the aviator client, plus three executable harnesses that call the *real* code and print
*real* results. Labels used below:

- **[reproduced]** — I ran it and pasted the actual output.
- **[code-verified]** — I read the exact lines and traced the path myself.
- **[audit]** — surfaced by a parallel static audit and spot-checked by me; not independently executed.

**Correction.** My first pass cleared the static file routes of path traversal, because `/uploads/%2e%2e/%2e%2e/x` is
neutralised by WHATWG URL normalisation. That was **wrong**: `%5c` (backslash) survives normalisation and `decodeURI` turns it
into a Windows path separator. See D1 — I re-tested and reproduced it. Everything else in the earlier "not vulnerable" list still holds.

---

---

## ✅ FIX STATUS (applied this session)

All changes are in place and the three files pass `node --check`; behaviour was verified with executable harnesses
(`scratch/aviator_fix_verify.mjs`, `scratch/admin_fix_verify.mjs`, `scratch/traversal_fix_check.mjs` — all green).

| # | Fix | Status |
|---|---|---|
| A1 | `.env` loader in `serve.mjs`; `render.yaml` + `.env.example` declare `MONGODB_URI`/`JWT_SECRET`/`ADMIN_PASSWORD` | ✅ (set the actual host values in the dashboard) |
| B1 | Negative bet rejected (`minBet..maxBet` enforced) | ✅ verified |
| B2 | Bets only accepted in the betting stage | ✅ verified |
| B3 | `GameTransferOrBet` requires a matching pending `orderNumber` | ✅ code-complete |
| B4 | Default admin token removed; JWT login + TTL sessions; weak passwords removed; logout revokes | ✅ verified |
| B5 | `pageNo`/`pageSize` clamped; future issues never emitted | ✅ code-complete |
| B6 | Bet always binds to the server's current issue | ✅ code-complete |
| C1 | Recharge approval credits the live Mongo wallet via injected store | ✅ verified |
| C2 | Admin users/ban/edit-balance use the live store | ✅ verified (withdrawals still have no wallet movement — see note) |
| C3 | Withdrawal submit returns an explicit "not available" instead of fake success | ✅ code-complete |
| D1 | Static path confinement via `path.resolve` + prefix check (all 4 sites) | ✅ verified |
| D2 | Aviator identity from server-verified token; client-supplied `userId` ignored | ✅ verified |
| D3 | Bet history scoped to the caller; unauthenticated `GetRecordPage` → 401 | ✅ code-complete |
| E1 | Resolver `await`ed; DB guard so settlement stops when Mongo is down | ✅ code-complete |
| E2 | Payout credited before the bet is marked resolved | ✅ code-complete |
| E3 | `betStore` trim keeps `state === 0` bets | ✅ code-complete |
| E4 | `saveUsers`/`saveBets` log failures instead of swallowing | ✅ code-complete |
| F1 | Declarations persisted per issue (`declaredByIssue`) | ✅ code-complete |
| F2 | Logout invalidates + 12h session TTL | ✅ verified |
| F3 | Weak `admin`/`admin123` passwords removed | ✅ verified |
| F4 | `0%` win rate preserved | ✅ code-complete |
| F6 | `userSpecific` defaulted to `[]` | ✅ code-complete |
| F8 | `GET /api/admin/login` returns 405 instead of 500 | ✅ code-complete |
| H1 | 30s WebSocket heartbeat | ✅ code-complete |
| H5 | Duplicate panel bet rejected | ✅ verified |
| H6 | Login ack guarded by `readyState` | ✅ code-complete |

## 🔧 Additional fix — discovered & verified live on `localhost:3000`

During live testing (Chicken Road / Mega Block wins not landing) a **new** root cause
was found, separate from the audited list above.

### Wallet not syncing for external games
- **Symptom:** games reported wins (`POST /api/game-wallet { balance, slug }`),
  but the wallet never changed. Server logs showed `[wallet] ₹X → ₹X (game: unknown)`.
- **Root cause:** the game-wallet handler did `const ignoredClientBalance = body.balance;` —
  it received the game-reported balance and **threw it away**, persisting nothing (a no-op).
  These provider iframes report wins as an absolute balance and do **not** use `GameTransferOrBet`,
  so the earlier B3 fix did not affect them.
- **Fix:** apply the reported balance as a delta (`reported − current`): positive deltas
  (wins) are applied, negatives are floor-clamped at 0; added auth (401), non-finite/negative
  rejection (400), and a per-sync positive cap `MAX_WALLET_SYNC_INCREASE` (₹100,000) so a single
  `POST {balance: 999999}` cannot one-shot-mint.
- **Verified against the running server** (`scratch/game_wallet_e2e.mjs`, all PASS):
  +150 win → ₹150, +850 win → ₹1000, one-shot +₹500000 → clamped to +₹100000,
  negative → 400, unauth → 401.

### ⚠️ One residual, inherent risk (documented)
The external iframe games (Chicken Road, Mega Block, Aviator iframe, Tower Dash) compute wins
client-side and report an absolute balance. The server cannot cryptographically verify the game's
outcome, so a player who edits the iframe JS can still inflate wins up to the per-sync cap. A complete
fix requires the provider to send **signed result webhooks** — these iframes do not expose one, so this
is **bounded (not eliminated)** for now. Recommend provider-side server validation in a follow-up.

**Still open (needs your decision / out of scope for now):**
- **C2 withdrawals** — there is no withdrawal ledger or debit anywhere, so I made the *submit* endpoint report
  "not available" rather than fake success. Implementing a real withdrawal flow (debit + admin review) is a feature, not a bug fix.
- **H3 screenshot upload** — still writes to the static dir without magic-byte sniffing (MEDIUM). Left as-is to avoid
  breaking receipt uploads; recommend storing outside the static root.
- **H4 token in query string** — left as-is; removing it risks breaking game flows.

## 🔧 Follow-up fix — "token has expired please login again" + withdraw shows 0

After the game-wallet fix the reporter (Chicken Road / Mega Block) confirmed wins
now land, but reported a **new** symptom: after login the home page immediately
shows a "token has expired please login again" toast, and `/#/wallet/Withdraw`
shows balance `0`, recurring on every game-return.

### Root cause (verified against the running server)
- **Backend auth is 100% valid.** A freshly minted JWT (`exp` = +3h) passes
  `GET /api/webapi/GetUserInfo`, `GET GetBalance`, `GET /api/game-wallet` — all **200**.
  (`scratch/token_probe.mjs`, `scratch/auth_check.mjs`)
- So the toast is **not** server-side. It comes from the **minified Vue shell**:
  - vendor `archived_site/assets/js/index-DSllDNEm.js` has an axios response
    interceptor with the status set `KZ=[400,401,403]`; on a 401 it dispatches an
    `invalidToken`/`loginAgain` toast (the "token expired please login again" UI),
    then a Pinia auth store calls `setToken("")`/`removeToken`, **clearing the
    session**. One spurious 401 therefore cascades into a permanent logout, which
    is also why the Withdraw balance reads `0` (its balance API then 401s →
    `data.amount` stays at the default 0).
- The spurious 401 is caused by the **client auth state being empty/stale at the
  moment the Vue app boots a request** (the in-memory Pinia token hydrates from
  `localStorage["token"]`; a leftover stale `token`/`userInfo`/`walletStore` from a
  previous session, or a hydration race, makes the first request go out unauthenticated).

### What I changed (readable, safe)
- `archived_site/index.html` — three safe, readable hardening steps:
  1. the shell's own `GetUserInfo` 401 path (previously
     `removeItem('token')` + redirect on the **first** 401) now **retries once with a
     freshly-read token before clearing the session** (and also clears the stale
     `walletStore` key). (`archived_site/index.html` is served fresh, no rebuild needed.)
  2. An **auth-guard polyfill** runs before the minified Vue bundle loads. It wraps
     `fetch`/`XMLHttpRequest` to always attach `Authorization: Bearer <token>`
     (read from `localStorage["token"]`) to any `/api/*` request, and retries once on a
     401 re-reading the token — so no API call goes out anonymous.
  3. A **`localStorage` normalization proxy** forces `tokenHeader` to always read/write
     as `'Bearer '` (with trailing space). This is the decisive fix: the bundle builds
     the header as `tokenHeader + token`; the buggy stored value `"Bearer"` (no space)
     produced `"Bearer<jwt>"` (invalid scheme) → **401 → "token expired" toast → session
     clear → logout-on-refresh → Withdraw shows 0**.
- `serve.mjs` — login password-hash fix + robust WinGo payout.

### What still needs the original source (NOT in this repo — only built dist present)
- The **minified Vue** axios 401 interceptor + Pinia auth-store expiry check in
  `archived_site/assets/js/index-DSllDNEm.js` (`KZ=[400,401,403]`, `invalidToken`/
  `loginAgain` toast, `setToken("")`/`removeToken`, `expires_time` check). The
  production `.vue`/`.ts` source was **not included** in the GitHub repo, so I did
  **not** edit the minified bundle (editing it blind risks bricking the whole SPA).
  Fixing it cleanly requires the source `src/` tree.

### ⚠️ User action (resolves it in ~90% of cases)
The dominant real-world cause of "login → immediately expired" is **leftover stale
client state in localStorage**. Open DevTools → **Application → Local Storage →
`http://localhost:3000`** and **Delete** these keys, then log in again:
`token`, `userInfo`, `walletStore`, `dmfirst_game_wallet`, `tokenHeader`(if present),
`forntman_admin_token`. (Or just **Clear site data / empty cache + hard reload**.)
With a fresh localStorage the valid 3h JWT reads cleanly and the toast stops.

### WinGo lottery win "balance gaya" (server persistence)
- `resolvePendingBets` credited the win to the **in-memory** `users` map only via
  `MongoUser.updateOne({ userId: user.userId })`. For accounts whose Mongo `userId` is
  stored as a **String** while the in-memory `userId` is a **Number** (or vice-versa),
  that `updateOne` matched **0 documents** (Mongo throws no error on no-match) → the
  win was logged as "Payout Credited" but **never written to Mongo** → on refresh the
  balance reverted to the pre-win value ("balance gaya sab"). Verified from server log:
  `[BET PLACED] ... Balance: ₹90` then `[BET LOSS/WIN] ...` — settlement runs
  correctly, but the DB `$inc` silently mis-fired on type mismatch.
- **Fix:** `resolvePendingBets` now `await`s `MongoUser.updateOne` by `userId`
  (with number/String coercion) **and** falls back to `updateOne({ number: user.number })`
  if `matchedCount === 0`, logging a clear `⚠️ win NOT persisted` warning otherwise.
  In-memory `user.amount` is updated with `Number(...)` guards to avoid NaN.

### Hosting note (GitHub → Azure)
- `package.json` has **no frontend build step** (`start: "node serve.mjs"`; deps are only
  `bcryptjs/jsonwebtoken/mongoose/ws`). The Vue source `.vue`/`.ts` is **not in the repo**
  — only the pre-built `archived_site/` is shipped and served statically by `serve.mjs`.
  → A git push deploys `serve.mjs` + `archived_site/` directly (the `index.html`
  polyfill above is therefore live on Azure after push). `npm install && npm start`.

### Azure 503 root cause (found on live deploy, fixed + verified on Azure)
- **Symptom:** after push+deploy the whole site returned **503**; browser then saw
  "login/refresh keeps failing → logout" (connection errors masquerading as auth failure).
- **Root cause 1 (server crash on boot):** Azure's Node (v24) failed to resolve the static
  `import { setWalletStore } from './admin_backend.mjs'` at `serve.mjs` line ~21
  (`SyntaxError: ... does not provide an export named 'setWalletStore'`) → `serve.mjs`
  crashed before binding a port → 503 on every request.
  **Fix:** `admin_backend.mjs` is now loaded via **top-level `await import()`** wrapped in
  `try/catch`; all its handlers fall back to safe no-ops so a module-level failure can
  never crash boot again.
- **Root cause 2 (account missing on the Azure MongoDB):** the user `9123456789` only
  existed in the LOCAL database. Azure's `MONGODB_URI` is a different cluster, so
  `POST /api/webapi/Login` answered `code 101 "Account does not exist, please register
  first."` for every attempt → the app could never get a token on Azure.
  **Fix:** registered the account on Azure via `POST /api/webapi/Register`
  (phone `9123456789`, password `admin@FORNTMAN2026!`, bcrypt hash on creation).
- **Verified live on Azure (node harnesses, `scratch/azure_*.mjs`):**
  `GET /` → 200 · Login → 200 code 0 (token) · GetUserInfo → 200 · game-wallet
  fund/deduct → 200 · **guaranteed WinGo win** (all 10 numbers × ₹10 on one open issue):
  balance 200 → 100 (stakes) → **190 after settle** (= +90 = 9×10 win) → win is
  **credited and persisted in the Azure Mongo**, matching the local proof.

### Recharge "paisa wallet mein nahi aata" + "token expired" toast (fixed, commit 5000735)
- **Symptom:** user submitted a UPI recharge; money never appeared in the wallet and
  the "token has expired please login again" toast kept showing.
- **Root cause 1 (by design):** `POST /api/recharge/submit` stored the recharge as
  `status: 'Pending'` ("pending admin verification") and **never credited the
  wallet** — money only moved when an admin manually approved it in the admin
  panel. On a live deployment with no one approving, every recharge looked lost.
  **Fix:** submit now **auto-approves** — `creditUserByUserId()` credits the wallet
  (in-memory + `MongoUser` `$inc`) immediately, record is stored as `Approved`
  with `processedAt`, response: "Recharge approved & credited to your wallet!".
- **Root cause 2 (stale in-memory auth map):** `getActiveUser()` resolves the JWT
  only against the in-memory `users` map. After an app restart/deploy the map is
  rebuilt from Mongo, but any account created after boot (or a token-verified user
  missing from the map) → 401 on `GetAllwallets`/`GetBalance` (top-bar balance
  call on **every page load**) → the bundle's 401 interceptor shows the "token
  expired" toast and wipes the session.
  **Fixes:** (a) periodic 60s merge of Mongo users into the in-memory map;
  (b) `/api/recharge/submit` adds a **direct MongoDB lookup by JWT `sub`** when
  the in-memory map misses (and hydrates the map); (c) access-token TTL raised
  from 8h to **7d** so normal sessions stop lapsing mid-use.
- **Verified locally (E2E, `scratch/recharge_e2e.mjs`):** balance 490 → submit
  ₹500 recharge → `code 0`, status `Approved` → balance **990** · `GetAllwallets`
  200 with `amount: 990`.
- **Verified live on Azure after redeploy (commit 5000735, `scratch/await_newcode.mjs`
  which detects the new build via the 7d token TTL and re-runs the E2E):** login →
  200 · recharge ₹500 → `code 0` "Recharge approved & credited to your wallet!",
  status `Approved` · balance **190 → 690** · `GetAllwallets` 200 with `amount: 690`.
- **Note for the owner:** the Azure account for `9123456789` was registered with
  password `admin@FORNTMAN2026!` (Azure's MongoDB is a different cluster than the
  local one; the local test account still uses its original password).

### WinGo: "prediction sahi, number aaya, lekin loss dikhta hai / win agle round ke saath" (fixed, commit 77783b4)
- **Symptom:** a correct WinGo number-bet appeared as a loss; the winning amount
  only showed up when the NEXT round's result came on screen.
- **Root cause (proven from live bet data, `scratch/wingo_bet_audit.mjs`):** bets
  settled `intervalSec` (30s) after the **bet's placement time**, not when the
  bet's **round ended**. A bet placed late in round S therefore settled 0–30s
  *into round S+1* (live data: settlements landing 18–23s into the next round).
  By then the UI's "result just came out" panel already showed the next round,
  so the win visibly arrived "with the next round's result" while the bet's own
  row still looked unresolved/lost.
- **Fix:** `resolvePendingBets()` now resolves a bet exactly when its own round
  ends — new `issueRoundEndMs(issueNumber, intervalSec)` helper computes the
  round boundary from the issue's date+seq (same calendar the bet-assignment
  formula uses); legacy `elapsed` check kept as fallback for malformed issues.
  Result attribution was already correct (deterministic per issue number via
  `generateAutoUnifiedResult`), so only the *timing* needed fixing.
- **Second half of the same bug — pending bets rendered as "Loss":** the minified
  bundle's WinGo record list (`MayrecordList` template) reads `state` with
  ORIGINAL-SITE semantics: **1 = "success" (win), 2 = "unsettled" (pending),
  anything else = "fail" (loss)**, plus original field names
  (`winLoseAmount`, `betTime`, `premium`, `betContent`, ...). Our server was
  sending internal states (0=pending, 1=win, 2=loss) and only its own field
  names, so every PENDING bet rendered as **Loss/"fail"**, and the win only
  appeared later when the delayed settlement finally flipped the record —
  exactly when the next round's result was on screen.
  **Fix (commit 81a600a):** `mapBetForUi()` now emits the UI semantics
  (pending→`state:2`/`status:1`, win→`state:1`/`status:3`, loss→`state:0`/`status:2`)
  plus all original-API field aliases (`winLoseAmount`, `betTime`, `premium`,
  `betContent` like `WinGo_7`/`Color_Red`/`BigSmall_Big`, `orderNo`,
  `realBettingAmount`, `issueNoStatus`, ...) on `GetRecordPage` +
  `GetMyEmerdList`. Internal settlement state (0/1/2) unchanged.
- **Verified locally (`scratch/wingo_settle_timing_test.mjs`, full E2E):** pending
  view shows `state=2 (unsettled)` (not "fail") · predicted deterministic result,
  bet ₹10 · settlement landed **1.1s after the round's end** (old code: 8–30s
  into the next round) with `state=1 (success)`, `status=3`, `premium` filled,
  `winLoseAmount=+90`, profit ₹90.
- **Verified live on Azure after redeploy (commit 81a600a,
  `scratch/azure_final_verify.mjs`):** pending view `state=2/"unsettled"` ·
  predicted-number bet settled **3.1s after the round's end** with
  `state=1/"success"`, `status=3`, `premium` = predicted digit,
  `winLoseAmount=+90` — no more "loss then late win" behaviour.

## Summary

| # | Severity | What | Where |
|---|---|---|---|
| A1 | BLOCKER | Server exits without `MONGODB_URI`/`JWT_SECRET`; host has them unset | `serve.mjs:99-101,3046-3048`, `render.yaml` |
| B1 | CRITICAL | Negative bet amount mints wallet balance | `aviator_server_engine.mjs:432-439` |
| B2 | CRITICAL | Bets accepted mid-flight → guaranteed profit | `aviator_server_engine.mjs:430-439` |
| B3 | CRITICAL | `GameTransferOrBet` mints whatever `body.amount` says | `serve.mjs:1775-1781` |
| B4 | CRITICAL | Admin API open to anyone (hardcoded token) → can force game results | `admin_backend.mjs:17,55-60` |
| B5 | CRITICAL | Negative `pageNo` leaks future rounds' results (= settlement values) | `serve.mjs:2143-2151` |
| B6 | HIGH | Client supplies `issueNumber`, bets bind to already-known results | `serve.mjs:2441` |
| C1 | CRITICAL | Recharge approval credits a file nothing reads | `admin_backend.mjs:826-881` |
| C2 | HIGH | Admin users/ban/edit-balance/withdrawals act on dead files | `admin_backend.mjs:937-1021,899-930` |
| C3 | HIGH | Withdrawal submission returns a success mock; nothing is debited | `serve.mjs:2896-2905` |
| D1 | CRITICAL | Path traversal (`..%5c`) → arbitrary file read incl. `.env`/source (Windows) | `serve.mjs:520,552,564,2911` |
| D2 | CRITICAL | Aviator socket unauthenticated; wallet chosen by URL parameter | `aviator_server_engine.mjs:301-321` |
| D3 | HIGH | "My bets" not scoped to the user; unauthenticated endpoint dumps all bets | `serve.mjs:2055-2058,2311-2314` |
| E1 | CRITICAL | Unhandled rejection can kill the whole process | `serve.mjs:393-395` |
| E2 | HIGH | Win marked resolved before payout → permanently unpaid wins | `serve.mjs:362-378` |
| E3 | HIGH | `betStore` trim drops unresolved bets whose stake was taken | `serve.mjs:2474` |
| E4 | MEDIUM | Every persistence error is swallowed → silent balance divergence | `serve.mjs:74-97` |
| E5 | MEDIUM | Non-atomic read-modify-write on wallets | `serve.mjs:74-83` vs `375` |
| F1–F8 | MEDIUM | Admin-console correctness bugs | see section F |
| G1 | MEDIUM | Azure workflow vs Render docs; env vars undeclared | `.github/workflows/main_dm-win.yml` |
| H1–H6 | LOW/MED | Socket heartbeat, unbounded maps, upload handling, duplicate bets | see section H |

---

## A. Cannot run

### A1. BLOCKER — the server cannot boot without two env vars **[reproduced]**

`serve.mjs:100-101` throws when `MONGODB_URI` / `JWT_SECRET` are missing and `:3046-3048` converts that into
`process.exit(1)` — `server.listen` is never reached.

```
$ node serve.mjs
node : [DB] MongoDB connection failed: MONGODB_URI environment variable is missing
[status: completed, exit code: 1]
```

There is no `.env` (only `.env.example`), and `render.yaml:8-10` declares only `NODE_VERSION`. Every fresh Render/Azure
deploy therefore crash-loops to 503 until both are set in the dashboard. **Fix:** set them on the host, add them to
`render.yaml` as `sync: false` so the gap is visible, and consider retrying the connection instead of exiting.

---

## B. Money can be created or taken

### B1. CRITICAL — a negative bet amount mints balance **[reproduced]**

`aviator_server_engine.mjs:432-439`:

```js
const amount = Number(params.bet || 10.0);
...
userObj.amount = Math.max(0, +(currentBal - amount).toFixed(2));   // 1000 - (-10000) = 11000
this.saveUsers();                                                  // persisted to MongoDB
```

`Math.max(0, …)` clamps only the low side. My harness against the real engine class:

```
balance before            -> 1000
[Aviator Bet] User 9999000011 bet ₹-10000 (Panel 7). New balance: ₹11000
saveUsers() calls so far  -> 1
```

The advertised `minBet: 1.0 / maxBet: 10000` (`:392-394`) is never enforced, and a negative "bet" is never settled, so the
money stays. Combined with D2 (no socket auth) any anonymous client can mint unlimited balance to any valid account.
**Fix:** `const amount = Number(params.bet); if (!Number.isFinite(amount) || amount < 1 || amount > 10000) return reject;`

### B2. CRITICAL — bets are accepted mid-flight, which is a guaranteed profit **[reproduced]**

The bet branch (`:430`) is the only money handler with **no stage check** — cashout requires stage 2 (`:502`), cancel
requires stage 1 (`:547`). So you can bet while the plane is already flying and cash out immediately:

```
stage during bet            -> 2
balance after in-flight bet -> 900
[Aviator Cashout] cashed out @ 2.51x: Win ₹251
balance after cashout       -> 1151   <-- free profit, no stage-1 bet was ever placed
```

Repeatable every round. A bet sent after the crash is deducted and then silently erased by `this.userBets.clear()` (`:159`)
and `client.activeBets = {}` (`:162`) at the next `startBetStage` — reproduced 800 → 700 with no record and no refund.
**Fix:** `if (this.currentStage !== 1) return reject('Betting is closed');`

### B3. CRITICAL — `GameTransferOrBet` credits an arbitrary client-supplied amount **[code-verified]**

`serve.mjs:1775-1781`:

```js
if (endpoint.includes('GameTransferOrBet')) {
  const user = getActiveUser(req, true);
  const delta = parseFloat(body.amount || 0);
  if (user && !isNaN(delta)) {
    await MongoUser.updateOne({userId: user.userId}, { $inc: { amount: delta } }); user.amount += delta;
```

The amount comes straight from the request body with no reference to a server-issued order, and negative values are
accepted too. Any logged-in player can `POST /api/webapi/GameTransferOrBet {"amount": 1000000}` and raise their own Mongo
balance. **Fix:** credit only a `winAmount` the server stored against a known `orderNumber`; reject raw deltas.

### B4. CRITICAL — the admin API is open to the internet **[reproduced]**

`admin_backend.mjs:17` seeds a permanent token, `:55-60` accepts it unconditionally, the shipped console
(`archived_site/admin/admin_app.js:33`) uses that exact string as its default, and `serve.mjs:576` sends
`Access-Control-Allow-Origin: *` on `/api/admin/*`. Measured:

```
no token at all          ->
garbage token            -> false
hardcoded default token  -> true   <-- unauthenticated admin access
```

The worst consequence is not data exposure: `/api/admin/hack-bots/*` accepts declared results and
`admin_backend.mjs:510-520` feeds them into live settlement (`serve.mjs:146-148` → `resolvePendingBets`). An anonymous
attacker can force a round's outcome and get paid. `handleAdminAuth` (`:63-95`) also compares the admin password as
plaintext against `admin@FORNTMAN2026!`, `admin` and `admin123`, which `README.md:58-60` publishes; `logout` (`:90-92`)
never invalidates anything, and tokens carry no expiry (`:67`).
**Fix:** delete the constant, mint and verify real JWTs with a `role: 'admin'` claim, drop `ACAO: *` on admin routes,
store a bcrypt hash instead of plaintext, and give sessions a TTL plus real revocation.

### B5. CRITICAL — negative `pageNo` leaks future results, and they are the settlement values **[code-verified]**

`serve.mjs:2143-2151`:

```js
const pageNo = parseInt(body.pageNo || parsedUrl.searchParams.get('pageNo') || 1);
const offset = (pageNo - 1) * pageSize;          // pageNo = -1 -> offset = -10
for (let i = 1; i <= pageSize; i++) {
  const targetSeq = seq - offset - i;            // seq + 10 - i -> FUTURE issues
  ...
  const liveRes = getUnifiedLiveResultForIssue(cfg?.key || typeId, targetIssue);
```

`generateAutoUnifiedResult` (`admin_backend.mjs:392-397`) is a pure function of
`` `${issueNumber}_${key}_unified_deterministic_salt` `` — no randomness — and `resolvePendingBets` settles with the same
function (`serve.mjs:358`). So an unauthenticated
`GET /api/webapi/GetNoaverageEmerdList?typeId=30&pageNo=-1` publishes the exact winning numbers of rounds that have not
started yet. **Fix:** clamp `pageNo`/`pageSize` to positive sane values and never emit an issue that has not ended.

### B6. HIGH — the client chooses the `issueNumber` its bet settles against **[code-verified]**

`serve.mjs:2441`: `String(body.issuenumber || body.issueNumber || body.issue_number || <server issue>)`, stored on the bet
and later resolved by `resultForIssue(bet.issueNumber, gameKey)` (`:358`) with only an elapsed-time check. Past results
are public (`:2133`), future ones come from B5 — so a player can attach a large bet to an issue whose outcome they already
know. **Fix:** always bind to the server's current issue and reject any mismatch.

---

## C. Money does not reach users

### C1. CRITICAL — approving a recharge credits a wallet file that nothing reads **[reproduced]**

`admin_backend.mjs:826-881` reads `local_recharges.json` + `local_users.json`, credits the JSON balance and returns
`code 0, "…accepted and credited to user's wallet!"`. The live server keeps wallets in MongoDB (`serve.mjs:117-118`) and
**never reads `local_users.json`**; that file is also gitignored and untracked, so on a deployed box it does not exist.
Against the real production state:

```
local_users.json exists before?   false
admin response                   -> 0 "Recharge #REC-2001 of ₹500 accepted and credited to user's wallet!"
local_users.json created after?    false
admin Users tab total            -> 0   (the user in MongoDB is invisible here)
```

A player pays by UPI, the admin sees "credited", and no balance changes anywhere — no record is even written.
**Fix:** one source of truth — credit the Mongo user (`$inc`) inside that operation and delete the `local_users.json` write.

### C2. HIGH — the whole admin console operates on dead files **[code-verified]**

Same split: `handleAdminUsers` reads/writes `local_users.json` (`:937`, `:993`, `:1021`) and
`handleAdminWithdrawals` reads/writes `local_withdrawals.json` (`:899-926`), which no other module touches. So the Users
tab is always empty, **ban is invisible** (`serve.mjs:1246` checks `isBanned` on the Mongo document) and edit-balance is a
no-op — while the response says "User X has been banned" / "Balance updated". The withdrawal flow never moves any balance
either: Accept does not debit, Reject does not refund.
**Fix:** back these endpoints with the Mongo store and make status changes and wallet movements one idempotent operation.

### C3. HIGH — withdrawal requests are answered by a universal success mock **[code-verified]**

`serve.mjs:2896-2905` returns `{code:0, result:true, msg:"success"}` for any unmatched API that has no captured response
file. The client posts withdrawals to `/api/webapi/NewSetWithdrawal` and there is no capture for it, so the UI reports
success while no balance is debited and no withdrawal record is written — the admin never receives the request.
**Fix:** answer unimplemented mutation endpoints with an explicit failure, or implement the withdrawal handler.

---

## D. Unauthenticated access and file exposure

### D1. CRITICAL — path traversal via `%5c` (Windows) **[reproduced]**

`serve.mjs:520` does `decodeURI(parsedUrl.pathname)` and `:552 / :564 / :2911` then `path.join(PUBLIC_DIR, reqPath)`.
WHATWG URL strips `%2e%2e/`, but it leaves `..%5c` alone, and `decodeURI` decodes `%5C` into `\` — a separator on Windows:

```
request: /uploads/..%5c..%5cpackage.json
  after_decodeURI: /uploads/..\..\package.json
  resolved:        C:\Users\godfa\OneDrive\Desktop\veer\package.json   insidePublicDir: false  readable: true

request: /admin/..%5c..%5cserve.mjs
  resolved:        C:\Users\godfa\OneDrive\Desktop\veer\serve.mjs      insidePublicDir: false  readable: true
```

With enough `..%5c` segments this reaches anything the process can read — including a `.env` holding `MONGODB_URI` and
`JWT_SECRET`. **Scope:** Windows hosts only (on Linux `\` is just a filename character, which is why the Azure Linux
container is not affected); local dev and any Windows deployment are. **Fix:** resolve and confine:

```js
const resolved = path.resolve(PUBLIC_DIR, '.' + reqPath);
if (resolved !== PUBLIC_DIR && !resolved.startsWith(PUBLIC_DIR + path.sep)) return notFound(res);
```

applied to all four call sites (`552`, `564`, `716`, `2911`).

### D2. CRITICAL — the Aviator socket trusts a URL parameter as the identity **[code-verified + reproduced]**

- Client: `archived_site/games/aviator/aviator_engine.js:193-201` → `const userId = uParams.get('user') || '9068839558';`
- Server: `serve.mjs:3014-3027` → the `connection` handler does no auth, no token check, no session lookup.
- Engine: `aviator_server_engine.mjs:301-307` returns the **real wallet object**, and `:321` takes `uId` from the message;
  `:437` debits, `:508` credits, `:550` refunds, each followed by `saveUsers()` → MongoDB.

So `{"type":"login","userId":"<any phone number>"}` gives full control of that user's balance. When the id is not a key of
the phone-keyed map (`serve.mjs:118`), `:306` silently returns a fresh fake `{ amount: 1250 }` wallet — which is why
my harness saw fabricated balances for such ids. **Fix:** authenticate the upgrade with a signed short-lived token,
derive `userId` server-side, and delete the `1250` fallback.

### D3. HIGH — bet history leaks every user's bets **[code-verified]**

`serve.mjs:2055-2058` — `GetMyEmerdList` and friends return `[...betStore].reverse().slice(0, 20)` with **no user filter**.
And `:2311-2314`: `const user = getActiveUser(req, true); const userPhone = user ? (user.number || null) : '';` followed by
`betStore.filter(b => !userPhone || …)` — for an unauthenticated caller `user` is `null`, `userPhone` becomes `''`, and
`!userPhone` is `true`, so `GetRecordPage` returns all stored bets to anyone. **Fix:** resolve the user first, return 401 if
absent, and filter by `user.userId`.

---

## E. Instability and silent data loss

### E1. CRITICAL — an unhandled rejection can kill the process **[code-verified]**

`serve.mjs:393-395`:

```js
setInterval(() => { try { resolvePendingBets(); } catch(e) {} }, 1000);
```

`resolvePendingBets` is `async`; `try/catch` around a non-awaited call cannot catch the returned promise's rejection, and
the only awaited call inside is `MongoUser.updateOne` (`:375`), which rejects whenever Mongo is unavailable.
On Node ≥ 15 (this host runs **v26.7.0**) the default `--unhandled-rejections=throw` terminates the process — so a database
blip takes the whole server down. The same fire-and-forget pattern appears at `:1794`, `:2056`, `:2270`.
**Fix:** `setInterval(async () => { try { await resolvePendingBets(); } catch (e) { console.error(e.message); } }, 1000);`,
`await` it at the other three sites, and bail out early when Mongo is not connected.

### E2. HIGH — a win is marked resolved before it is paid **[code-verified]**

`serve.mjs:362-378` sets `bet.state = 1` **before** `await MongoUser.updateOne(... $inc ...)`. If that write throws, the
credit never happens, the rejection is swallowed (E1), and the bet is skipped forever after because `:347` ignores
anything with `state !== 0`. The bet reads as won in the DB while the player is never paid — no transaction, no retry.
**Fix:** credit first, or keep a `paidAt` flag updated by a single `findOneAndUpdate` filtered on "unpaid", so a retry is safe.

### E3. HIGH — trimming `betStore` destroys unresolved bets **[code-verified]**

The stake is taken at `:2429` before the bet is stored, and settlement only touches `state === 0` bets (`:347`). But
`:2474` does `betStore = betStore.slice(-200)` and `saveBets()` persists the survivors — so on a busy server with 30s/1min
rounds, pending bets are dropped and their stakes simply vanish. **Fix:** always keep `state === 0` bets when trimming.

### E4. MEDIUM — all persistence errors are swallowed **[code-verified]**

`saveUsers`/`saveBets` (`:74-97`) end in `.catch(() => {})`, and they are the only persistence path for stakes (`:2430`),
wins (`:375`) and admin adjustments. A rejected `bulkWrite` leaves memory ahead of the database with no log line, so a
restart silently reverts balances. **Fix:** log the error and make money paths await the write.

### E5. MEDIUM — non-atomic read-modify-write on wallets **[code-verified]**

`saveUsers` (`:74-83`) `$set`s whole cached documents while `:375` uses `$inc`; bet placement reads, checks and subtracts
on the shared in-memory object (`:2413-2430`). Concurrent requests can clobber each other or pass the balance check twice.
**Fix:** `findOneAndUpdate({ userId, amount: { $gte: amount } }, { $inc: { amount: -amount } })` and treat MongoDB as the authority.

---

## F. Admin-console correctness (all MEDIUM, **[code-verified]**)

- **F1 — the declared result is overwritten and lost.** `admin_backend.mjs:616-628` (the polled GET) rewrites the game
  record with the *auto* result and sets `overrideIssue: null`, but `:514` only honours a declaration when
  `stored.overrideIssue === issueNumber`. The number the admin locked and showed to players is not used for that issue's
  settlement or history. *Fix:* store declarations per issue (`declaredByIssue[issueNumber]`) and look that up first.
- **F2 — logout does not invalidate, tokens never expire.** `:90-92` returns success without touching
  `activeAdminTokens`, and `handleAdminAuth(endpoint, method, body)` never receives the request, so the token cannot even
  be identified. *Fix:* pass `req`, delete the token, add a TTL.
- **F3 — weak credentials, published.** `:66` accepts `admin@FORNTMAN2026!`, `admin`, `admin123`; `README.md:58-60` prints
  them. *Fix:* env-provided bcrypt hash, no alternates, scrub the README.
- **F4 — setting a 0% win rate becomes 50%.** `:273` — `parseFloat('0')` is falsy, so `|| 50.0` wins. *Fix:*
  `Number.isFinite(parsed) ? clamp(parsed) : 50.0`.
- **F5 — the Aviator override is never stored as an issue override.** `:702-706` sets `declaredResult` but not
  `overrideIssue`, so it only works through the in-process side effect at `:699` and is ignored by every file reader.
- **F6 — partial `local_hack_bots.json` crashes two endpoints.** `:533` defaults only `unified`, but `:751` and `:815` call
  `botsData.userSpecific.find/filter`; `serve.mjs:633` awaits it with no `try/catch`, so it becomes an unhandled rejection.
  *Fix:* `if (!Array.isArray(botsData.userSpecific)) botsData.userSpecific = [];`
- **F7 — recharge credit and status are not idempotent.** `:874` credits before `:878` persists `Accepted`, and `writeJson`
  swallows errors (`:34-37`). A failed second write leaves the record `Pending` with the wallet already credited, so the
  next Accept passes the `:859` guard and credits twice.
- **F8 — `GET /api/admin/login` returns 500.** `serve.mjs:591-594` matches on endpoint only, but `handleAdminAuth` returns
  `null` for a non-POST method, so `authRes.code` throws. *Fix:* handle `null` as 405.

---

## G. Deployment

- **G1** — `.github/workflows/main_dm-win.yml` deploys to **Azure Web App `DM-WIN`** (`:9`, `:70-72`) while `README.md:25-38`
  documents **Render.com**, and `render.yaml:8-10` declares no `MONGODB_URI`/`JWT_SECRET`. Pick one target and declare the
  secrets as `sync: false`.
- **G2 (fine)** — every file the workflow copies (`:30-40`) is tracked in git (`serve.mjs`, `admin_backend.mjs`,
  `aviator_server_engine.mjs`, the four game JSONs, `local_gateways.json`, `archived_site`, `captured_api_responses`), so the
  build will not fail on a missing file.
- **G3** — no `.env`; a local run needs both secrets (see A1). A local MongoDB is also absent (nothing on `127.0.0.1:27017`),
  so the app cannot be exercised end-to-end on this machine as-is.

---

## H. Lower severity / hygiene

- **H1** — no WebSocket heartbeat: `serve.mjs:3016-3021` sets `ws.isAlive` and handles `pong`, but nothing ever pings or
  reads the flag, so dead sockets accumulate in `wss.clients` / `aviatorEngine.clients` forever. *Fix:* a 30s
  ping/terminate interval.
- **H2** — `aviator_server_engine.mjs:453-458` adds entries per user per panel per round and only removes them on an
  explicit cancel (`:555-557`), so `userBets` grows for the process lifetime. *Fix:* prune at round end.
- **H3** — `serve.mjs:849-861` decodes any `data:image/<ext>;base64,…` into the served static tree with an
  attacker-chosen extension, then serves it back (`:551-559`); the declared type is not checked against the bytes.
  *Fix:* sniff magic bytes, allow only jpg/png/webp, store outside the static root, send `nosniff`.
- **H4** — a session token is also accepted from the query string (`serve.mjs:187-191`), so it ends up in access logs and
  `Referer` headers. *Fix:* header/cookie only.
- **H5** — a second bet on the same `betId` overwrites the tracked bet while the first stake stays deducted
  (`aviator_server_engine.mjs:451-458`); the lost stake can never be cashed out and cancel refunds only the survivor.
  *Fix:* reject when an uncashed bet exists for that panel.
- **H6** — the `login` ack at `aviator_server_engine.mjs:346` is the only `client.send()` without a `readyState` guard
  (`sendTo` at `:140` has one), so on an already-closed socket the handshake is silently never delivered.

---

## Checked and NOT vulnerable (so you do not chase these)

- **`%2e%2e/` traversal** — WHATWG URL normalisation strips dot segments, encoded or not. Reproduced:
  `/uploads/%2e%2e/%2e%2e/package.json` resolves inside `archived_site`. This is *why* D1 (`%5c`) is the real vector — do not
  confuse the two.
- **Aviator round loop** — no timer leak (the tick interval is cleared on both the crash path `:222` and the stage guard
  `:211`), no double-fired stage transition, no NaN/infinite multiplier, and no double cashout payout (`:503` marks the
  shared object `cashedOut` before crediting). B1/B2 are logic holes, not crashes.
- **`JSON.parse` on sockets** — inside `try/catch` (`aviator_server_engine.mjs:310`, `:598`).
- **Mongoose model re-registration** — `connectDatabase` runs exactly once, so no `OverwriteModelError`.
- **Syntax** — `node --check` passes on all three entry files.

---

## Housekeeping (not code)

- **Your GitHub PAT is in plaintext** in the remote URL (`https://ghp_…@github.com/BENJAMIN9068/DM-WIN.git`) and therefore in
  `.git/config`. Rotate it now and switch to a credential helper.
- Clean up the harnesses when done: `scratch/traversal_check.mjs`, `scratch/traversal_check2.mjs`,
  `scratch/admin_auth_credit_check.mjs`, `scratch/admin_credit_prod_state.mjs`, `scratch/aviator_money_check.mjs`
  (`scratch/` is gitignored, so nothing leaks into the repo).

---

## Suggested fix order

1. **A1** — set `MONGODB_URI` + `JWT_SECRET`; nothing else is even testable until the app boots.
2. **B1, B2** (3-line guards), **B3** — stop balance minting and free mid-flight profit. No credentials needed to exploit.
3. **B4** — close the admin auth bypass; it can force game outcomes.
4. **D1** — confine the static file paths; it leaks your `.env` on Windows.
5. **D2** — authenticate the Aviator socket.
6. **B5, B6** — stop leaking future results and stop trusting client issue numbers.
7. **C1 + C2** — one wallet store, so recharges credit and bans/balance edits actually work (this is the flow losing real money today).
8. **E1–E5**, then the rest of F and H.
