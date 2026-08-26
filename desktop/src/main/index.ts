import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { spawn, ChildProcess } from 'child_process'

import { existsSync } from 'fs'

let trackerProcess: ChildProcess | null = null

function getPythonPath(): string {
  const possiblePaths = [
    join(__dirname, '../../../backend/venv/Scripts/python.exe'),
    join(__dirname, '../../../backend/.venv/Scripts/python.exe'),
    join(__dirname, '../../../../backend/venv/Scripts/python.exe'),
    join(app.getAppPath(), '../backend/venv/Scripts/python.exe'),
    join(app.getAppPath(), '../../backend/venv/Scripts/python.exe'),
    join(process.cwd(), 'backend/venv/Scripts/python.exe'),
    join(process.cwd(), '../backend/venv/Scripts/python.exe'),
    join(__dirname, '../../../backend/venv/bin/python3'),
    join(__dirname, '../../../backend/.venv/bin/python3')
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return process.platform === 'win32' ? 'python' : 'python3'
}

function getTrackerPath(): string {
  const possiblePaths = [
    join(__dirname, '../../../tracker/core.py'),
    join(__dirname, '../../../../tracker/core.py'),
    join(app.getAppPath(), '../tracker/core.py'),
    join(app.getAppPath(), '../../tracker/core.py'),
    join(process.cwd(), 'tracker/core.py'),
    join(process.cwd(), '../tracker/core.py')
  ]
  for (const p of possiblePaths) {
    if (existsSync(p)) return p
  }
  return join(process.cwd(), 'tracker/core.py')
}

function startTracker(token: string) {
  if (trackerProcess) {
    stopTracker()
  }

  const trackerPath = getTrackerPath()
  const pythonExecutable = getPythonPath()
  
  console.log(`Starting tracker with python: ${pythonExecutable} at ${trackerPath}`)
  
  trackerProcess = spawn(pythonExecutable, [trackerPath, '--token', token, '--interval', '30'], {
    cwd: join(trackerPath, '..')
  })
  
  trackerProcess.stdout?.on('data', (data) => {
    console.log(`Tracker: ${data}`)
  })
  
  trackerProcess.stderr?.on('data', (data) => {
    console.error(`Tracker Error: ${data}`)
  })

  trackerProcess.on('close', (code) => {
    console.log(`Tracker process exited with code ${code}`)
    trackerProcess = null
  })
}

function stopTracker() {
  if (trackerProcess) {
    try {
      if (process.platform === 'win32' && trackerProcess.pid) {
        spawn('taskkill', ['/pid', trackerProcess.pid.toString(), '/f', '/t'])
      } else {
        trackerProcess.kill('SIGINT')
      }
    } catch (err) {
      console.error('Error stopping tracker:', err)
    }
    trackerProcess = null
  }
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers for tracking engine
  ipcMain.on('start-tracking', (_, token) => {
    startTracker(token)
  })
  
  ipcMain.on('stop-tracking', () => {
    stopTracker()
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
