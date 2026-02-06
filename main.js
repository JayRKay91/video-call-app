const { app, BrowserWindow, session } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 900,
    height: 700,
    webPreferences: {
      // This allows us to use 'require' and other Node features in our UI
      nodeIntegration: true, 
      contextIsolation: false 
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  // 1. Setup permissions for camera and microphone access
  session.defaultSession.setPermissionCheckHandler((webapp, permission) => {
    if (permission === 'media') return true;
    return true; 
  });

  session.defaultSession.setPermissionRequestHandler((webapp, permission, callback) => {
    if (permission === 'media') return callback(true);
    callback(true);
  });

  // 2. Launch the window
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});