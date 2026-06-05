const { app, BrowserWindow, dialog, shell } = require('electron')
const { autoUpdater } = require('electron-updater')
const { spawn } = require('node:child_process')
const fs = require('node:fs')
const http = require('node:http')
const net = require('node:net')
const path = require('node:path')

const API_HOST = '127.0.0.1'
const API_PORT = 5000
const MYSQL_PORT = 3306
let backendProcess = null
let mysqlProcess = null
let staticServer = null
let mainWindow = null

const resourcesPath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '..')
const webRoot = app.isPackaged
  ? path.join(resourcesPath, 'web')
  : path.join(resourcesPath, 'web', 'dist-admin')
const backendRoot = app.isPackaged
  ? path.join(resourcesPath, 'backend')
  : path.join(resourcesPath, 'backend')

const readDesktopConfig = () => {
  const candidates = [
    path.join(resourcesPath, 'cloud-runtime.json'),
    path.join(__dirname, 'cloud-runtime.json'),
  ]
  for (const file of candidates) {
    try {
      if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch {}
  }
  return {}
}

const desktopConfig = readDesktopConfig()
const usesRemoteApi = desktopConfig.mode === 'cloud'
  && /^https?:\/\//i.test(String(desktopConfig.apiBaseUrl || ''))

const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
}

const apiIsRunning = () => new Promise((resolve) => {
  const request = http.get({ host: API_HOST, port: API_PORT, path: '/', timeout: 1500 }, (response) => {
    response.resume()
    resolve(response.statusCode === 200)
  })
  request.on('timeout', () => {
    request.destroy()
    resolve(false)
  })
  request.on('error', () => resolve(false))
})

const tcpPortIsRunning = (port) => new Promise((resolve) => {
  const socket = net.createConnection({ host: API_HOST, port })
  const finish = (ready) => {
    socket.destroy()
    resolve(ready)
  }
  socket.setTimeout(1000)
  socket.once('connect', () => finish(true))
  socket.once('timeout', () => finish(false))
  socket.once('error', () => finish(false))
})

const findMysqlExecutable = () => {
  const candidates = [
    process.env.DIAGAUTO_MYSQLD_PATH,
    'C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysqld.exe',
    'C:\\xampp\\mysql\\bin\\mysqld.exe',
    'D:\\xampp\\mysql\\bin\\mysqld.exe',
  ].filter(Boolean)

  const mysqlRoot = path.join(process.env.ProgramFiles || 'C:\\Program Files', 'MySQL')
  if (fs.existsSync(mysqlRoot)) {
    for (const directory of fs.readdirSync(mysqlRoot)) {
      candidates.push(path.join(mysqlRoot, directory, 'bin', 'mysqld.exe'))
    }
  }
  return candidates.find(candidate => fs.existsSync(candidate)) || null
}

const findMysqlData = () => {
  const candidates = [
    process.env.DIAGAUTO_MYSQL_DATA_DIR,
    'D:\\APK\\DiagAutoConnect\\mysql-data',
    'D:\\APK\\mysql-data',
    path.join(app.getPath('userData'), 'mysql-data'),
  ].filter(Boolean)
  return candidates.find(candidate => fs.existsSync(path.join(candidate, 'ibdata1'))) || null
}

const ensureMysql = async () => {
  if (await tcpPortIsRunning(MYSQL_PORT)) return true

  const executable = findMysqlExecutable()
  const dataDirectory = findMysqlData()
  if (!executable || !dataDirectory) return false

  mysqlProcess = spawn(executable, [
    '--no-defaults',
    `--datadir=${dataDirectory}`,
    `--port=${MYSQL_PORT}`,
    `--bind-address=${API_HOST}`,
  ], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
  })
  mysqlProcess.unref()

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await tcpPortIsRunning(MYSQL_PORT)) return true
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  return false
}

const waitForApi = async () => {
  for (let attempt = 0; attempt < 25; attempt += 1) {
    if (await apiIsRunning()) return true
    await new Promise(resolve => setTimeout(resolve, 400))
  }
  return false
}

const startBackend = async () => {
  const mysqlReady = await ensureMysql()
  if (!mysqlReady) return false
  if (await apiIsRunning()) return true

  const serverFile = path.join(backendRoot, 'server.js')
  if (!fs.existsSync(serverFile)) return false

  backendProcess = spawn(process.execPath, [serverFile], {
    cwd: backendRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'ignore',
    windowsHide: true,
  })
  backendProcess.unref()
  return waitForApi()
}

const startStaticServer = () => new Promise((resolve, reject) => {
  staticServer = http.createServer((request, response) => {
    const requestPath = decodeURIComponent((request.url || '/').split('?')[0])
    if (requestPath === '/api' || requestPath.startsWith('/api/')) {
      const proxyRequest = http.request({
        host: API_HOST,
        port: API_PORT,
        path: request.url,
        method: request.method,
        headers: {
          ...request.headers,
          host: `${API_HOST}:${API_PORT}`,
        },
      }, (proxyResponse) => {
        response.writeHead(proxyResponse.statusCode || 502, proxyResponse.headers)
        proxyResponse.pipe(response)
      })
      proxyRequest.on('error', () => {
        response.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' })
        response.end(JSON.stringify({ message: 'Serveur DiagAuto indisponible.' }))
      })
      request.pipe(proxyRequest)
      return
    }

    const relativePath = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '')
    let filePath = path.resolve(webRoot, relativePath)

    if (!filePath.startsWith(path.resolve(webRoot)) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(webRoot, 'index.html')
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
        response.end('Impossible de charger l’application.')
        return
      }
      response.writeHead(200, {
        'Content-Type': mimeTypes[path.extname(filePath)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      response.end(content)
    })
  })

  staticServer.once('error', reject)
  staticServer.listen(0, API_HOST, () => resolve(staticServer.address().port))
})

const setupAutoUpdate = () => {
  if (!app.isPackaged || process.env.PORTABLE_EXECUTABLE_FILE) return

  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true
  autoUpdater.logger = console

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('diagauto-update-available', { version: info.version })
  })

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Mise à jour prête',
      message: `DiagAuto Admin ${info.version} est prêt.`,
      detail: 'Redémarrez maintenant pour installer automatiquement la nouvelle version.',
      buttons: ['Redémarrer et installer', 'Plus tard'],
      defaultId: 0,
      cancelId: 1,
    })
    if (response === 0) autoUpdater.quitAndInstall(false, true)
  })

  autoUpdater.on('error', (error) => {
    console.error('Mise à jour automatique indisponible:', error.message)
  })

  const check = () => autoUpdater.checkForUpdates().catch(error => {
    console.error('Vérification de mise à jour impossible:', error.message)
  })
  setTimeout(check, 10000)
  setInterval(check, 6 * 60 * 60 * 1000)
}

const createWindow = async () => {
  const apiReady = usesRemoteApi ? true : await startBackend()
  if (usesRemoteApi) startBackend().catch(() => false)
  const port = await startStaticServer()

  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#f4f6f9',
    title: 'DiagAuto Admin',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })
  mainWindow = window

  window.once('ready-to-show', () => {
    window.show()
    if (!apiReady) {
      dialog.showMessageBox(window, {
        type: 'warning',
        title: 'Serveur indisponible',
        message: 'Le serveur DiagAuto ne peut pas démarrer.',
        detail: 'Vérifiez que MySQL est démarré, puis relancez DiagAuto Admin.',
      })
    }
  })

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(`http://${API_HOST}:${port}`)) return { action: 'allow' }
    shell.openExternal(url)
    return { action: 'deny' }
  })

  await window.loadURL(`http://${API_HOST}:${port}`)
  setupAutoUpdate()
}

app.whenReady().then(createWindow).catch((error) => {
  dialog.showErrorBox('DiagAuto Admin', error.message)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  staticServer?.close()
  if (backendProcess && !backendProcess.killed) backendProcess.kill()
})
