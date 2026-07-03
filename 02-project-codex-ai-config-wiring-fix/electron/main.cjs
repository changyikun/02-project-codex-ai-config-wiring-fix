const { app, BrowserWindow, Menu, shell } = require('electron');
const path = require('node:path');

const createMainWindow = () => {
  const window = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: '#efe3d0',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.once('ready-to-show', () => {
    window.show();
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  const indexPath = path.join(app.getAppPath(), 'dist-app', 'index.html');
  void window.loadFile(indexPath);
};

app.commandLine.appendSwitch('disable-pinch');
app.commandLine.appendSwitch('disable-features', 'OverscrollHistoryNavigation');

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
