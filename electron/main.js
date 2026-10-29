import { app, BrowserWindow, shell } from "electron";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
let mainWindow;
let localServer;

app.setName("LeadJá");

async function createWindow() {
  if (!localServer) {
    const scraperExecutable = await findScraperExecutable();
    localServer = await startServer({
      port: 0,
      dataDir: join(app.getPath("userData"), "data"),
      scraperExecutable,
    });
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 390,
    minHeight: 640,
    title: "LeadJá",
    backgroundColor: "#edf5f1",
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  await mainWindow.loadURL(localServer.url);
}

async function findScraperExecutable() {
  const candidates = [
    process.env.LEADJA_SCRAPER_PATH,
    app.isPackaged ? join(process.resourcesPath, "bin", "google-maps-scraper") : "",
    join(projectRoot, "resources", "bin", "google-maps-scraper"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      await access(candidate, constants.X_OK);
      return candidate;
    } catch {
      // Continue until an executable candidate is found.
    }
  }
  return null;
}

app.whenReady().then(createWindow).catch((error) => {
  console.error(error);
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow().catch(console.error);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  localServer?.server.close();
});
