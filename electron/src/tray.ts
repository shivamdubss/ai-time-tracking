import { Tray, Menu, nativeImage, BrowserWindow, app } from "electron";
import * as path from "path";

let tray: Tray | null = null;

export function createTray(mainWindow: BrowserWindow): Tray {
  const iconPath = path.join(__dirname, "..", "resources", "icon.png");
  let icon = nativeImage.createFromPath(iconPath);

  // Resize for tray (16x16 on most platforms, 22x22 on Linux)
  if (!icon.isEmpty()) {
    icon = icon.resize({ width: 16, height: 16 });
  }

  tray = new Tray(icon);
  tray.setToolTip("Donna");

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Open Donna",
      click: () => {
        mainWindow.show();
        mainWindow.focus();
      },
    },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on("click", () => {
    mainWindow.show();
    mainWindow.focus();
  });

  return tray;
}

export function destroyTray(): void {
  if (tray) {
    tray.destroy();
    tray = null;
  }
}
