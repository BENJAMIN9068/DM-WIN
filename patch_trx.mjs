import fs from 'fs';

// 1. Patch archived_site/assets/js/index-Y1wvGlRe.js
let trxCode = fs.readFileSync('archived_site/assets/js/index-Y1wvGlRe.js', 'utf8');

const targetZ = 't.value.gameNo=_.predraw.issueNumber,t.value.currentTime=_.predraw.serviceTime.replace(/-/g,"/"),t.value.beginTime=_.predraw.startTime.replace(/-/g,"/"),M.value=_.settled,ae()';
const safeZ = 'let _p=_?.predraw||_||{};t.value.gameNo=_p.issueNumber||"202610010001",t.value.currentTime=(_p.serviceTime||"2026/10/01 12:00:00").replace(/-/g,"/"),t.value.beginTime=(_p.startTime||"2026/10/01 12:00:00").replace(/-/g,"/"),M.value=_?.settled||[],ae()';

if (trxCode.includes(targetZ)) {
  trxCode = trxCode.replace(targetZ, safeZ);
  console.log('[+] Patched TRX Z function with safe predraw fallback');
}

const targetHistory = 'let M=h?.data.date.serviceTime;e.value=h.data.gameslist.map(t=>{if(t.blockID){';
const safeHistory = 'let M=h?.data?.date?.serviceTime||h?.date?.serviceTime;let gl=h?.data?.gameslist||h?.gameslist||[];e.value=gl.map(t=>{if(t.blockID){';

if (trxCode.includes(targetHistory)) {
  trxCode = trxCode.replace(targetHistory, safeHistory);
  console.log('[+] Patched TRX history map with safe fallback');
}

fs.writeFileSync('archived_site/assets/js/index-Y1wvGlRe.js', trxCode, 'utf8');
console.log('Saved index-Y1wvGlRe.js!');

// 2. Update serve.mjs to return predraw for TRX issues and date+gameslist for TRX history
let serveCode = fs.readFileSync('serve.mjs', 'utf8');

const trxIssueBlock = `      res.end(JSON.stringify({
        code: 0,
        result: true,
        msg: "success",
        data: {
          issueNumber,
          preIssue: \`\${dateStr}\${String(Math.max(1, issueSeq - 1)).padStart(4, '0')}\`,
          startTime,
          serviceTime,
          endTime,
          remainingTime: remainingSec,
          seconds: remainingSec,
          lotteryTime: intervalSec,
          preResult: "7"
        }
      }));`;

const safeTrxIssueBlock = `      const baseIssue = {
        issueNumber,
        preIssue: \`\${dateStr}\${String(Math.max(1, issueSeq - 1)).padStart(4, '0')}\`,
        startTime,
        serviceTime,
        endTime,
        remainingTime: remainingSec,
        seconds: remainingSec,
        lotteryTime: intervalSec,
        preResult: "7"
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
      }));`;

if (serveCode.includes(trxIssueBlock)) {
  serveCode = serveCode.replace(trxIssueBlock, safeTrxIssueBlock);
  console.log('[+] Updated serve.mjs GetGameIssue to include predraw and settled');
}

// Add TRX history response format
const trxHistTarget = `    // Lottery History Results
    if (endpoint.includes('GetEmerdList') || endpoint.includes('GetNoaverageEmerdList') || endpoint.includes('GetHistoryIssuePage') || endpoint.includes('GetMyEmerdList')) {`;

const trxHistNew = `    // TRX Lottery History Results
    if (endpoint.includes('GetTRXNoaverageEmerdList') || endpoint.includes('GetTRXMyEmerdList') || endpoint.includes('WinTxrGetTRXNoaverageEmerdList') || endpoint.includes('WinTxrGetTRXMyEmerdList')) {
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
      const totalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
      const seq = Math.floor(totalSeconds / 60) + 1;
      const gameslist = [];
      for (let i = 1; i <= 10; i++) {
        gameslist.push({
          issueNumber: \`\${dateStr}\${String(Math.max(1, seq - i)).padStart(4, '0')}\`,
          blockID: "0000000000000000000c8b21a37c4e51241f8796850c9521361cb61d4287c8d9",
          number: (seq - i) % 10,
          colour: (seq - i) % 2 === 0 ? "red" : "green",
          bs: (seq - i) % 10 >= 5 ? "b" : "s"
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

    // Lottery History Results
    if (endpoint.includes('GetEmerdList') || endpoint.includes('GetNoaverageEmerdList') || endpoint.includes('GetHistoryIssuePage') || endpoint.includes('GetMyEmerdList')) {`;

if (serveCode.includes(trxHistTarget)) {
  serveCode = serveCode.replace(trxHistTarget, trxHistNew);
  console.log('[+] Added specialized TRX history endpoint in serve.mjs');
}

fs.writeFileSync('serve.mjs', serveCode, 'utf8');
console.log('Saved serve.mjs!');
