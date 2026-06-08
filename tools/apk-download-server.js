const http = require('http');
const fs = require('fs');
const path = require('path');

const apkPath = process.env.APK_PATH || 'C:\\Users\\DiagAutoMada\\Desktop\\DiagAuto-Client-Cloud-v1.6.2-connecte-admin.apk';
const port = Number(process.env.PORT || 8099);
const fileName = path.basename(apkPath);

http.createServer((req, res) => {
  const route = String(req.url || '').split('?')[0];
  if (route !== '/' && route !== '/apk') {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  fs.stat(apkPath, (statErr, stat) => {
    if (statErr || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('APK not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(apkPath).pipe(res);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`DiagAuto APK download: http://0.0.0.0:${port}/apk`);
});

