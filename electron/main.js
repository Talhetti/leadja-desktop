import { app, BrowserWindow, ipcMain, shell, WebContentsView } from "electron";
import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startServer } from "../server.js";
import { isAllowedWhatsAppUrl, toWhatsAppWebUrl } from "./whatsapp.js";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
let mainWindow;
let localServer;
let whatsappView;
let whatsappLoaded = false;

app.setName("LeadJá");
app.commandLine.appendSwitch("lang", "pt-BR");

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
      preload: join(projectRoot, "electron", "preload.cjs"),
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    destroyWhatsAppView();
    mainWindow = null;
  });
  await mainWindow.loadURL(localServer.url);
}

function createWhatsAppView() {
  if (whatsappView && !whatsappView.webContents.isDestroyed()) return whatsappView;

  whatsappView = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      partition: "persist:leadja-whatsapp",
      sandbox: true,
      spellcheck: true,
    },
  });
  whatsappView.setBackgroundColor("#ffffff");

  const { webContents } = whatsappView;
  webContents.setUserAgent(`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`);
  webContents.setZoomFactor(0.85);
  const whatsappSession = webContents.session;
  const permissionAllowed = (permission, origin) => {
    const isWhatsApp = origin === "https://web.whatsapp.com" || origin.startsWith("https://web.whatsapp.com/");
    return isWhatsApp && ["media", "notifications", "clipboard-sanitized-write"].includes(permission);
  };
  whatsappSession.setPermissionCheckHandler((_contents, permission, origin) => permissionAllowed(permission, origin));
  whatsappSession.setPermissionRequestHandler((_contents, permission, callback, details) => {
    callback(permissionAllowed(permission, details.requestingUrl || details.requestingOrigin || ""));
  });

  webContents.setWindowOpenHandler(({ url }) => {
    if (isAllowedWhatsAppUrl(url)) webContents.loadURL(url).catch(reportWhatsAppError);
    else if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  webContents.on("will-navigate", (event, url) => {
    if (isAllowedWhatsAppUrl(url)) return;
    event.preventDefault();
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
  });
  webContents.on("did-start-loading", () => sendWhatsAppStatus("loading", "Carregando WhatsApp Web…"));
  webContents.on("did-finish-load", () => {
    if (/4xx|error/i.test(webContents.getTitle())) reportWhatsAppError(new Error(webContents.getTitle()));
    else sendWhatsAppStatus("ready", "WhatsApp Web pronto");
  });
  webContents.on("did-fail-load", (_event, code, description, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return;
    reportWhatsAppError(new Error(`${description} (${code}) ao abrir ${url}`));
  });

  mainWindow.contentView.addChildView(whatsappView);
  whatsappView.setVisible(false);
  return whatsappView;
}

function sendWhatsAppStatus(status, message) {
  if (!mainWindow?.isDestroyed()) mainWindow.webContents.send("whatsapp:status", { status, message });
}

function reportWhatsAppError(error) {
  console.error("WhatsApp Web:", error);
  sendWhatsAppStatus("error", "Não foi possível carregar o WhatsApp Web.");
}

function destroyWhatsAppView() {
  if (whatsappView && !whatsappView.webContents.isDestroyed()) whatsappView.webContents.close();
  whatsappView = null;
  whatsappLoaded = false;
}

function safeViewBounds(value) {
  const [width, height] = mainWindow.getContentSize();
  const x = Math.max(0, Math.min(Math.round(Number(value?.x) || 0), width));
  const y = Math.max(0, Math.min(Math.round(Number(value?.y) || 0), height));
  const availableWidth = Math.max(1, width - x);
  const availableHeight = Math.max(1, height - y);
  return {
    x,
    y,
    width: Math.max(1, Math.min(Math.round(Number(value?.width) || 1), availableWidth)),
    height: Math.max(1, Math.min(Math.round(Number(value?.height) || 1), availableHeight)),
  };
}

ipcMain.handle("whatsapp:show", async (_event, { bounds, chatUrl } = {}) => {
  if (!mainWindow || mainWindow.isDestroyed()) return { ok: false };
  const view = createWhatsAppView();
  view.setBounds(safeViewBounds(bounds));
  view.setVisible(true);

  const target = chatUrl ? toWhatsAppWebUrl(chatUrl) : "https://web.whatsapp.com/";
  if (chatUrl || !whatsappLoaded) {
    whatsappLoaded = true;
    await view.webContents.loadURL(target).catch(reportWhatsAppError);
  }
  return { ok: true };
});

ipcMain.handle("whatsapp:bounds", (_event, bounds) => {
  if (!whatsappView || whatsappView.webContents.isDestroyed() || !mainWindow) return { ok: false };
  whatsappView.setBounds(safeViewBounds(bounds));
  return { ok: true };
});

ipcMain.handle("whatsapp:hide", () => {
  whatsappView?.setVisible(false);
  return { ok: true };
});

ipcMain.handle("whatsapp:reload", async () => {
  if (!whatsappView || whatsappView.webContents.isDestroyed()) return { ok: false };
  whatsappView.webContents.reload();
  return { ok: true };
});

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
  destroyWhatsAppView();
  localServer?.server.close();
});
