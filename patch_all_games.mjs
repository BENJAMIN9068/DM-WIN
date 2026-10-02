import fs from 'fs';

// 1. Patch K3
let k3Code = fs.readFileSync('archived_site/assets/js/index-Ds4OWXfz.js', 'utf8');
const k3Orig = 'await s.getK3Data(),m=s.getK3;const G=m.findIndex(F=>F.typeID==f);z.value==null&&!f?L(0):L(y??G)}';
const k3Safe = 'await s.getK3Data(),m=s.getK3||[];const G=m.findIndex(F=>F.typeID==f);let idx=y??G;if(idx<0||idx>=m.length)idx=0;L(idx)}';
if (k3Code.includes(k3Orig)) {
  k3Code = k3Code.replace(k3Orig, k3Safe);
  fs.writeFileSync('archived_site/assets/js/index-Ds4OWXfz.js', k3Code, 'utf8');
  console.log('[+] Patched K3 component safe index');
}

// 2. Patch 5D
let d5Code = fs.readFileSync('archived_site/assets/js/index-DpD6c5Tg.js', 'utf8');
const d5Orig = 'await m.get5DData(),v=m.get5D;const G=v.findIndex(F=>F.typeID==p);A.value==null&&!p?ie(0):ie(h??G)}';
const d5Safe = 'await m.get5DData(),v=m.get5D||[];const G=v.findIndex(F=>F.typeID==p);let idx=h??G;if(idx<0||idx>=v.length)idx=0;ie(idx)}';
if (d5Code.includes(d5Orig)) {
  d5Code = d5Code.replace(d5Orig, d5Safe);
  fs.writeFileSync('archived_site/assets/js/index-DpD6c5Tg.js', d5Code, 'utf8');
  console.log('[+] Patched 5D component safe index');
}

// 3. Patch TRX
let trxCode = fs.readFileSync('archived_site/assets/js/index-Y1wvGlRe.js', 'utf8');
const trxOrig = 'await r.getTrxData(),m=r.trx;const v=m.findIndex(_=>_.typeID==B);k.value==null&&!B?X(0):X(n??v)}';
const trxSafe = 'await r.getTrxData(),m=r.trx||[];const v=m.findIndex(_=>_.typeID==B);let idx=n??v;if(idx<0||idx>=m.length)idx=0;X(idx)}';
if (trxCode.includes(trxOrig)) {
  trxCode = trxCode.replace(trxOrig, trxSafe);
  fs.writeFileSync('archived_site/assets/js/index-Y1wvGlRe.js', trxCode, 'utf8');
  console.log('[+] Patched TRX component safe index');
}

// 4. Update serve.mjs
let serveCode = fs.readFileSync('serve.mjs', 'utf8');

// Replace lottery type list block with specialized handlers
const typeListBlock = `    // Lottery Type List (WinGo, TRX, K3, 5D)
    if (endpoint.includes('GetTypeList') || endpoint.includes('WinGoGetTypeList') || endpoint.includes('GetTRXtypeList') || endpoint.includes('GetK3TypeList') || endpoint.includes('Get5DtypeList')) {`;

const newTypeListBlock = `    // Specialized Lottery Type Lists
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
    if (endpoint.includes('GetTypeList') || endpoint.includes('WinGoGetTypeList')) {`;

if (serveCode.includes(typeListBlock)) {
  serveCode = serveCode.replace(typeListBlock, newTypeListBlock);
  console.log('[+] Updated serve.mjs with separated type lists for K3, 5D, and TRX');
}

// Add image fallbacks in static file serving:
const fallbackTarget = `    } else if (reqPath.startsWith('/assets/')) {
      // 404 for missing static assets (never return html for missing JS/CSS)
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }`;

const fallbackReplacement = `    } else if (reqPath.startsWith('/assets/')) {
      const ext = path.extname(filePath).toLowerCase();
      if (ext === '.png' || ext === '.jpg' || ext === '.webp') {
        res.writeHead(200, { 'Content-Type': 'image/png' });
        res.end(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'));
        return;
      }
      if (ext === '.svg') {
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"></svg>');
        return;
      }
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }`;

if (serveCode.includes(fallbackTarget)) {
  serveCode = serveCode.replace(fallbackTarget, fallbackReplacement);
  console.log('[+] Added image fallback response in serve.mjs');
}

fs.writeFileSync('serve.mjs', serveCode, 'utf8');
console.log('Saved serve.mjs!');
