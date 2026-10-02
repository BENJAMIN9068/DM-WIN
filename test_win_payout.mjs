(async () => {
  const getBal = async () => {
    const res = await (await fetch('http://localhost:3000/api/webapi/GetBalance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })).json();
    return res.data.amount;
  };

  console.log('--- Initial Balance Check ---');
  let bStart = await getBal();
  console.log('Current balance:', bStart);

  // If balance is low, let's deposit some test balance for testing
  if (bStart < 100) {
    await fetch('http://localhost:3000/api/webapi/GameTransferOrBet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 500 })
    });
    bStart = await getBal();
    console.log('Balance after topup:', bStart);
  }

  // 1. Get current issue for WinGo 30s
  const issueRes = await (await fetch('http://localhost:3000/api/webapi/GetGameIssue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeId: 30 })
  })).json();
  const issueNumber = issueRes.data.issueNumber;
  console.log('Target Issue Number:', issueNumber);

  // Get the unified result for this issue
  const { getUnifiedLiveResultForIssue } = await import('./admin_backend.mjs');
  const live = getUnifiedLiveResultForIssue('wingo_30s', issueNumber);
  const targetNum = parseInt(live.result);
  const targetColour = targetNum % 2 === 0 ? 'red' : 'green';
  const targetBs = targetNum >= 5 ? '13' : '14'; // 13=big, 14=small
  console.log('Predetermined Result for Issue', issueNumber, ':', targetNum, '| Colour:', live.details.colour, '| BS:', targetBs);

  // TEST A: Place a winning bet on the EXACT NUMBER (multiplier 9x)
  console.log('\n--- TEST A: Bet on Exact Number', targetNum, '---');
  const bBeforeBetA = await getBal();
  const betARes = await (await fetch('http://localhost:3000/api/webapi/GameBetting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typeId: 30,
      issuenumber: issueNumber,
      amount: 10,
      betCount: 1,
      gameType: 1,
      selectType: targetNum // number bet!
    })
  })).json();
  console.log('Bet A placed:', betARes.msg, 'Deducted 10. Balance:', await getBal());

  // Wait 4 seconds for resolution
  console.log('Waiting 4 seconds for auto-resolution engine...');
  await new Promise(r => setTimeout(r, 4000));

  const bAfterA = await getBal();
  console.log('Balance after auto-resolution:', bAfterA);
  const expectedProfitA = parseFloat((9.8 * 9).toFixed(2)); // 88.20
  const actualDeltaA = parseFloat((bAfterA - (bBeforeBetA - 10)).toFixed(2));
  console.log('Expected Payout:', expectedProfitA, '| Actual Payout Added:', actualDeltaA);
  console.log('Test A Success:', actualDeltaA === expectedProfitA ? '✅ YES!' : '❌ NO!');

  // TEST B: Place a winning bet on Big / Small (multiplier 2x)
  console.log('\n--- TEST B: Bet on Big/Small (selectType:', targetBs, ') ---');
  const bBeforeBetB = await getBal();
  const betBRes = await (await fetch('http://localhost:3000/api/webapi/GameBetting', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      typeId: 30,
      issuenumber: issueNumber,
      amount: 20,
      betCount: 1,
      gameType: 2,
      selectType: targetBs
    })
  })).json();
  console.log('Bet B placed:', betBRes.msg, 'Deducted 20. Balance:', await getBal());

  await new Promise(r => setTimeout(r, 4000));

  const bAfterB = await getBal();
  console.log('Balance after auto-resolution:', bAfterB);
  const expectedProfitB = parseFloat((19.6 * 2).toFixed(2)); // 39.20
  const actualDeltaB = parseFloat((bAfterB - (bBeforeBetB - 20)).toFixed(2));
  console.log('Expected Payout:', expectedProfitB, '| Actual Payout Added:', actualDeltaB);
  console.log('Test B Success:', actualDeltaB === expectedProfitB ? '✅ YES!' : '❌ NO!');

  // TEST C: Check GetWinTheLotteryResult
  console.log('\n--- TEST C: Check GetWinTheLotteryResult response ---');
  const winTheLotteryRes = await (await fetch('http://localhost:3000/api/webapi/GetWinTheLotteryResult', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ issueNumber: [issueNumber] })
  })).json();
  console.log('Win popup data items count:', winTheLotteryRes.data.length);
  winTheLotteryRes.data.forEach(d => {
    console.log(`Order: ${d.orderNumber} | Issue: ${d.issueNumber} | State: ${d.state} (1=Win,2=Loss) | WinAmount: ₹${d.winAmount} | Profit: ₹${d.profitAmount}`);
  });

  // TEST D: Check GetMyEmerdList (History table)
  console.log('\n--- TEST D: Check GetMyEmerdList (My Game Record) ---');
  const emerdRes = await (await fetch('http://localhost:3000/api/webapi/GetMyEmerdList', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ typeId: 30, pageNo: 1, pageSize: 5 })
  })).json();
  emerdRes.data.list.slice(0, 3).forEach(b => {
    console.log(`History Record: Issue ${b.issueNumber} | Select: ${b.selectType} | State: ${b.state} | WinAmount: ₹${b.winAmount}`);
  });
})();
