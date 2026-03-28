import { app, BrowserWindow, dialog, Menu } from "electron";
import * as path from "path";
import * as fs from "fs";
import { startBackend, stopBackend } from "./sidecar";
import { createTray, destroyTray } from "./tray";

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;
let logFile: string | null = null;

function getLogFile(): string {
  if (!logFile) {
    logFile = path.join(app.getPath("userData"), "donna-electron.log");
  }
  return logFile;
}

function log(msg: string) {
  const line = `${new Date().toISOString()} [main] ${msg}\n`;
  process.stdout.write(line);
  try {
    fs.appendFileSync(getLogFile(), line);
  } catch {
    // app may not be ready yet
  }
}

function createWindow(port: number): BrowserWindow {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: "Donna",
    icon: path.join(__dirname, "..", "resources", "icon.png"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  // Clear cache to avoid stale frontend builds
  mainWindow.webContents.session.clearCache();
  mainWindow.loadURL(`http://127.0.0.1:${port}`);

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    if (!app.isPackaged) {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  return mainWindow;
}

// Single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

app.on("second-instance", () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  log("Donna starting up");
  log(`  Platform: ${process.platform}`);
  log(`  Arch: ${process.arch}`);
  log(`  Electron: ${process.versions.electron}`);
  log(`  Packaged: ${app.isPackaged}`);
  log(`  User data: ${app.getPath("userData")}`);

  try {
    const port = await startBackend();
    const win = createWindow(port);
    createTray(win);
    log("Donna ready");
  } catch (err: any) {
    log(`Startup failed: ${err.message}`);
    dialog.showErrorBox(
      "Donna Error",
      `Failed to start Donna.\n\n${err.message}\n\nCheck the log file at:\n${getLogFile()}`
    );
    app.quit();
  }
});

app.on("before-quit", async () => {
  isQuitting = true;
  destroyTray();
  await stopBackend();
});

app.on("window-all-closed", () => {
  // Don't quit — tray keeps running. Close via tray "Quit".
});

app.on("activate", () => {
  if (mainWindow) {
    mainWindow.show();
  }
});
