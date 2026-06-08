const http = require('http');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

const PORT     = 8098;
const APK_DIR  = path.join(os.homedir(), 'Desktop', 'GESTION LOCATION');
const ADMIN_APK  = path.join(APK_DIR, 'FleetTrack-Admin.apk');
const CLIENT_APK = path.join(APK_DIR, 'FleetTrack-Client.apk');

function serveApk(apkPath, name, res) {
  fs.stat(apkPath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('APK introuvable : ' + apkPath);
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Length': stat.size,
      'Content-Disposition': `attachment; filename="${name}"`,
      'Cache-Control': 'no-store'
    });
    fs.createReadStream(apkPath).pipe(res);
  });
}

http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const route = (req.url || '').split('?')[0];
  if (route === '/admin') {
    serveApk(ADMIN_APK, 'FleetTrack-Admin.apk', res);
  } else if (route === '/client' || route === '/') {
    serveApk(CLIENT_APK, 'FleetTrack-Client.apk', res);
  } else {
    res.writeHead(404); res.end('Not found');
  }
}).listen(PORT, '0.0.0.0', () => {
  const ip = Object.values(os.networkInterfaces())
    .flat().find(i => i.family === 'IPv4' && !i.internal)?.address || '127.0.0.1';
  console.log('\n=== FleetTrack APK Server ===');
  console.log('Client APK : http://' + ip + ':' + PORT + '/client');
  console.log('Admin  APK : http://' + ip + ':' + PORT + '/admin');
  console.log('=============================\n');
});
