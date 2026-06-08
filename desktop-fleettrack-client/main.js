const { app, BrowserWindow, shell, Menu } = require('electron')
const path = require('path')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: 'FleetTrack Pro',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false,
    },
    show: false,
    backgroundColor: '#0d1117',
  })

  // Supprimer la barre de menu (File, Edit, View…)
  Menu.setApplicationMenu(null)

  mainWindow.loadFile('app.html')

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Bloquer DevTools si ouvert malgré devTools:false
  mainWindow.webContents.on('devtools-opened', () => {
    mainWindow.webContents.closeDevTools()
  })

  // Bloquer raccourcis clavier DevTools (F12, Ctrl+Shift+I/J/C, Ctrl+U)
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const ctrl = input.control || input.meta
    const badKey = input.key === 'F12' ||
      (ctrl && input.shift && ['I','J','C'].includes(input.key.toUpperCase())) ||
      (ctrl && input.key.toLowerCase() === 'u')
    if (badKey) event.preventDefault()
  })

  // Bloquer le clic droit (menu contextuel)
  mainWindow.webContents.on('context-menu', (e) => e.preventDefault())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url)
      return { action: 'deny' }
    }
    return { action: 'allow' }
  })

  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
