import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = 3899;
const BASE_URL = `http://localhost:${PORT}`;

function request(method, path, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({ status: res.statusCode, headers: res.headers, body: json });
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('--- STARTING E2E VERIFICATION SUITE ---');

  // Spawn server on PORT 3899
  const serverProcess = spawn('node', ['serve.mjs'], {
    env: { ...process.env, PORT: String(PORT) },
    stdio: 'pipe'
  });

  serverProcess.stdout.on('data', d => {
    // console.log(`[SERVER]: ${d.toString().trim()}`);
  });
  serverProcess.stderr.on('data', d => {
    console.error(`[SERVER ERR]: ${d.toString().trim()}`);
  });

  // Wait for server to be responsive
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await request('GET', '/api/webapi/GetHomeSettings');
      if (res.status === 200) {
        ready = true;
        break;
      }
    } catch (e) {}
    await sleep(200);
  }

  if (!ready) {
    serverProcess.kill();
    throw new Error('Server failed to start within timeout');
  }
  console.log('✓ Server is active on port', PORT);

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const testPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'SecurePassword123!';
  let userToken = '';
  let userId = '';

  try {
    // Step 1: Register new account
    console.log('\n[1] User Registration & Initial Balance Verification');
    const regRes = await request('POST', '/api/webapi/Register', {
      username: testPhone,
      pwd: testPassword
    });
    assert(regRes.status === 200 && regRes.body.result === true, 'Registration succeeds for new phone number');
    assert(regRes.body.data && regRes.body.data.token, 'Token returned on successful registration');
    userToken = regRes.body.data.token;
    userId = regRes.body.data.parentUserId;

    // Step 2: Register existing account
    console.log('\n[2] Reject Duplicate Registration');
    const dupRegRes = await request('POST', '/api/webapi/Register', {
      username: testPhone,
      pwd: testPassword
    });
    assert(dupRegRes.status === 400 && dupRegRes.body.code === 104, 'Registration rejects existing phone with code 104');

    // Step 3: Login with non-existent phone
    console.log('\n[3] Reject Non-Existent Account Login');
    const fakePhone = '9999999999';
    const fakeLoginRes = await request('POST', '/api/webapi/Login', {
      username: fakePhone,
      pwd: 'somepassword'
    });
    assert(fakeLoginRes.status === 400 && fakeLoginRes.body.code === 101, 'Login rejects non-existent account with code 101');

    // Step 4: Login with wrong password
    console.log('\n[4] Reject Wrong Password');
    const wrongPassRes = await request('POST', '/api/webapi/Login', {
      username: testPhone,
      pwd: 'WrongPassword999!'
    });
    assert(wrongPassRes.status === 400 && wrongPassRes.body.code === 102, 'Login rejects wrong password with code 102');

    // Step 5: Login with correct credentials
    console.log('\n[5] Successful Login & Session Token Generation');
    const loginRes = await request('POST', '/api/webapi/Login', {
      username: testPhone,
      pwd: testPassword
    });
    assert(loginRes.status === 200 && loginRes.body.result === true, 'Login succeeds with correct credentials');
    assert(loginRes.body.data && loginRes.body.data.token, 'Session token assigned');
    userToken = loginRes.body.data.token;

    // Step 6: Protected GetUserInfo without token
    console.log('\n[6] Protected GetUserInfo Endpoint');
    const unauthInfo = await request('POST', '/api/webapi/GetUserInfo');
    assert(unauthInfo.status === 401 && unauthInfo.body.code === 4, 'GetUserInfo rejects unauthenticated request with 401');

    // Step 7: GetUserInfo with token (initial balance must be 0.00)
    const authInfo = await request('POST', '/api/webapi/GetUserInfo', {}, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(authInfo.status === 200 && authInfo.body.data.amount === 0.00, 'GetUserInfo returns authoritative 0.00 initial balance');

    // Step 8: Wallets & Balance APIs
    console.log('\n[7] Wallets & Balance APIs Authorization');
    const unauthBal = await request('POST', '/api/webapi/GetAllwallets');
    assert(unauthBal.status === 401, 'GetAllwallets rejects unauthenticated request with 401');

    const authBal = await request('POST', '/api/webapi/GetAllwallets', {}, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(authBal.status === 200 && authBal.body.data.balance === 0.00, 'GetAllwallets returns authoritative 0.00 balance');

    // Step 9: Game wallet sync endpoint
    console.log('\n[8] Game Wallet Sync Endpoint Protection');
    const unauthGameWal = await request('GET', '/api/game-wallet');
    assert(unauthGameWal.status === 401, '/api/game-wallet rejects unauthenticated request with 401');

    const authGameWal = await request('GET', '/api/game-wallet', null, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(authGameWal.status === 200 && authGameWal.body.balance === 0.00, '/api/game-wallet returns 0.00 balance for authenticated user');

    // Step 10: Recharge Submission Validation
    console.log('\n[9] Recharge Submission & Amount Validation');
    const unauthRec = await request('POST', '/api/recharge/submit', { amount: 500 });
    assert(unauthRec.status === 401, 'Recharge submission rejects unauthenticated request with 401');

    const invalidRec = await request('POST', '/api/recharge/submit', {
      amount: 50, // Below minimum 100
      utr: '123456789012',
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(invalidRec.status === 400, 'Recharge submission rejects amount < ₹100');

    // Step 11: Valid Recharge Submission
    const validRec = await request('POST', '/api/recharge/submit', {
      amount: 1000,
      utr: '987654321098',
      gateway: 'UPI-QR',
      screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
    }, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(validRec.status === 200 && validRec.body.result === true, 'Recharge request submitted successfully');
    assert(validRec.body.data && validRec.body.data.status === 'Pending', 'Recharge status is strictly set to Pending');
    const rechargeId = validRec.body.data.id;

    // Step 12: Admin Auth & Recharge Approval
    console.log('\n[10] Admin Authentication & Balance Credit');
    const adminLoginRes = await request('POST', '/api/admin/login', {
      username: 'admin',
      password: 'admin123'
    });
    const adminToken = adminLoginRes.body?.data?.token;
    assert(!!adminToken, 'Admin login succeeds and returns admin session token');

    const approveRes = await request('POST', '/api/admin/recharges/action', {
      rechargeId,
      action: 'Accept'
    }, {
      Authorization: `Bearer ${adminToken}`,
      Cookie: `admin_token=${adminToken}`
    });
    assert(approveRes.status === 200 && approveRes.body.result === true, 'Admin approves recharge request');

    // Step 13: Verify User Balance after approval
    const afterApproveInfo = await request('POST', '/api/webapi/GetUserInfo', {}, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(afterApproveInfo.body.data.amount === 1000.00, 'User balance is credited with ₹1000 authoritative balance');

    // Step 14: Wingo Bet with insufficient balance (> 1000)
    console.log('\n[11] Wingo Game Bet Validation & Atomic Full-Balance Deduction');
    const overBetRes = await request('POST', '/Lottery/WinGoBet', {
      typeId: 1,
      amount: 1500,
      betCount: 1,
      selectType: '11'
    }, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(overBetRes.status === 400 && overBetRes.body.code === 105, 'Wingo bet with insufficient balance (₹1500 on ₹1000) is rejected');

    // Step 15: Wingo Bet with FULL WALLET BALANCE (₹1000 on ₹1000)
    const fullBetRes = await request('POST', '/Lottery/WinGoBet', {
      typeId: 1,
      amount: 1000,
      betCount: 1,
      selectType: '11'
    }, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(fullBetRes.status === 200 && fullBetRes.body.result === true, 'Full wallet bet (₹1000) placed successfully');
    assert(fullBetRes.body.data && fullBetRes.body.data.balance === 0.00, 'Bet response returns authoritative updated balance of ₹0.00');

    // Step 16: Verify Home / GetUserInfo re-fetches authoritative balance
    const afterBetInfo = await request('POST', '/api/webapi/GetUserInfo', {}, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(afterBetInfo.body.data.amount === 0.00, 'GetUserInfo confirms authoritative balance is exactly ₹0.00 after bet');

    // Step 17: Lottery Bet Record History
    console.log('\n[12] Lottery Bet History Endpoint');
    const recordRes = await request('POST', '/Lottery/GetRecordPage', {}, {
      Authorization: `Bearer ${userToken}`,
      Cookie: `token=${userToken}`
    });
    assert(recordRes.status === 200 && recordRes.body.data && Array.isArray(recordRes.body.data.list), 'GetRecordPage returns bet records array');
    assert(recordRes.body.data.list.some(b => b.amount === 1000), 'Bet record with ₹1000 appears in user history');

    // Step 18: Gateway Routes Verification (Direct 200 OK without popup)
    console.log('\n[13] 4 Dedicated UPI Gateway Pages (Direct Routing)');
    const g1 = await request('GET', '/upi-qr');
    assert(g1.status === 200, 'Gateway /upi-qr serves 200 OK');
    const g2 = await request('GET', '/upixqr');
    assert(g2.status === 200, 'Gateway /upixqr serves 200 OK');
    const g3 = await request('GET', '/wallet-qr');
    assert(g3.status === 200, 'Gateway /wallet-qr serves 200 OK');
    const g4 = await request('GET', '/paytmqr');
    assert(g4.status === 200, 'Gateway /paytmqr serves 200 OK');

    // Step 19: Unauthenticated Admin APIs
    console.log('\n[14] Admin Route Protection');
    const unauthAdmin = await request('GET', '/api/admin/dashboard');
    assert(unauthAdmin.status === 401, 'Admin dashboard rejects unauthenticated request with 401');

  } catch (err) {
    console.error('Test Suite encountered an unexpected error:', err);
    failed++;
  } finally {
    serverProcess.kill();
  }

  console.log('\n====================================');
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log('====================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
