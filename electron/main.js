import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  nativeImage,
  Notification,
  session,
  shell,
  Tray,
} from "electron";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(appDirectory, "..");
const appProtocol = "workspace";
const backendUrl = "http://localhost:3001";
const devUrl = process.env.ELECTRON_START_URL || "http://localhost:5173";
const oauthTimeoutMs = 5 * 60 * 1000;

let mainWindow;
let tray;
let backendServer;
let isQuitting = false;
let pendingOAuthChallenge;
let pendingOAuthTimeout;
let pendingOAuthResult;
let protocolRegistered = false;

const hasSingleInstanceLock = app.requestSingleInstanceLock();

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("open-url", (event, url) => {
    event.preventDefault();
    receiveOAuthCallback(url);
  });

  app.on("second-instance", (_event, commandLine) => {
    const protocolUrl = commandLine.find((argument) =>
      argument.startsWith(`${appProtocol}://`),
    );
    if (protocolUrl) receiveOAuthCallback(protocolUrl);
    showWindow();
  });

  app.on("activate", showWindow);
  app.on("before-quit", () => {
    isQuitting = true;
    clearTimeout(pendingOAuthTimeout);
    backendServer?.close();
  });

  app.setAppUserModelId("com.workspace.tasksnotes");
  if (process.defaultApp && process.argv.length >= 2) {
    protocolRegistered = app.setAsDefaultProtocolClient(
      appProtocol,
      process.execPath,
      [path.resolve(process.argv[1])],
    );
  } else {
    protocolRegistered = app.setAsDefaultProtocolClient(appProtocol);
  }

  ipcMain.handle("desktop:version", () => app.getVersion());
  ipcMain.handle("desktop:notify", (event, notification) => {
    if (event.sender !== mainWindow?.webContents) {
      throw new Error("Desktop notifications can only be requested by the app window.");
    }
    if (!Notification.isSupported()) return false;

    const title =
      typeof notification?.title === "string"
        ? notification.title.trim().slice(0, 100)
        : "";
    const body =
      typeof notification?.body === "string"
        ? notification.body.trim().slice(0, 500)
        : "";
    if (!title || !body) {
      throw new TypeError("A notification title and message are required.");
    }

    new Notification({ title, body }).show();
    return true;
  });
  ipcMain.handle("gmail:connect", async (event) => {
    if (event.sender !== mainWindow?.webContents) {
      throw new Error("Gmail authorization can only be started by the app window.");
    }
    if (!protocolRegistered) {
      throw new Error("Windows could not register the Workspace Gmail callback protocol.");
    }
    if (pendingOAuthChallenge) {
      throw new Error("A Gmail authorization is already waiting for completion.");
    }

    const challenge = randomBytes(32).toString("hex");
    pendingOAuthChallenge = challenge;
    pendingOAuthTimeout = setTimeout(() => {
      if (pendingOAuthChallenge !== challenge) return;
      pendingOAuthChallenge = undefined;
      pendingOAuthResult = {
        challenge,
        error: "timeout",
      };
      deliverOAuthResult();
    }, oauthTimeoutMs);
    pendingOAuthTimeout.unref();

    try {
      const authorizationUrl = new URL("/auth/google", backendUrl);
      authorizationUrl.searchParams.set("desktop", "1");
      authorizationUrl.searchParams.set("challenge", challenge);
      await shell.openExternal(authorizationUrl.toString());
      return true;
    } catch (error) {
      clearTimeout(pendingOAuthTimeout);
      pendingOAuthChallenge = undefined;
      throw new Error(`Could not open the system browser: ${error.message}`);
    }
  });

  app.whenReady().then(startApplication).catch((error) => {
    dialog.showErrorBox("Workspace could not start", error.message);
    app.quit();
  });
}

function configureRuntimeEnvironment() {
  process.env.DESKTOP_APP = "1";
  process.env.DESKTOP_PROTOCOL = appProtocol;
  process.env.NODE_ENV = app.isPackaged ? "production" : "development";
  process.env.PORT = process.env.PORT || "3001";
  process.env.APP_ORIGIN = app.isPackaged
    ? backendUrl
    : new URL(devUrl).origin;

  if (app.isPackaged) {
    const configPath = path.join(app.getPath("userData"), ".env");
    if (!existsSync(configPath)) {
      copyFileSync(path.join(app.getAppPath(), ".env.example"), configPath);
    }
    process.env.APP_ENV_PATH = configPath;
  }
}

async function startApplication() {
  session.defaultSession.setPermissionRequestHandler(
    (_webContents, _permission, callback) => {
      callback(false);
    },
  );
  configureRuntimeEnvironment();
  const { startServer } = await import("../backend/index.js");
  backendServer = startServer("localhost");
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("The local API did not start within 10 seconds.")),
      10000,
    );
    backendServer.once("listening", () => {
      clearTimeout(timeout);
      resolve();
    });
    backendServer.once("error", (error) => {
      clearTimeout(timeout);
      reject(
        error.code === "EADDRINUSE"
          ? new Error(
              "Port 3001 is already in use. Close the other app or backend, then try again.",
            )
          : error,
      );
    });
  });

  createTray();
  createWindow();

  const startupUrl = process.argv.find((argument) =>
    argument.startsWith(`${appProtocol}://`),
  );
  if (startupUrl) receiveOAuthCallback(startupUrl);
}

function createWindow() {
  if (mainWindow) {
    showWindow();
    return;
  }

  const iconPath = path.join(app.getAppPath(), "electron", "assets", "icon.ico");
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    show: false,
    frame: true,
    autoHideMenuBar: true,
    backgroundColor: "#f5f4ef",
    icon: iconPath,
    webPreferences: {
      preload: path.join(app.getAppPath(), "electron", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalLink(url);
    return { action: "deny" };
  });
  mainWindow.webContents.on("will-navigate", (event, url) => {
    if (isTrustedAppUrl(url)) return;
    event.preventDefault();
    openExternalLink(url);
  });
  mainWindow.webContents.on("will-attach-webview", (event) => {
    event.preventDefault();
  });
  mainWindow.webContents.on("did-finish-load", deliverOAuthResult);
  mainWindow.once("ready-to-show", () => mainWindow?.show());
  mainWindow.on("close", (event) => {
    if (isQuitting) return;
    event.preventDefault();
    mainWindow?.hide();
    showTrayNotification("Workspace is still running in the system tray.");
  });
  mainWindow.on("closed", () => {
    mainWindow = undefined;
  });

  void mainWindow.loadURL(app.isPackaged ? backendUrl : devUrl);
}

function createTray() {
  const iconPath = path.join(app.getAppPath(), "electron", "assets", "icon.ico");
  const icon = nativeImage.createFromPath(iconPath);
  if (icon.isEmpty()) throw new Error("The Workspace system tray icon is missing.");

  tray = new Tray(icon);
  tray.setToolTip("Workspace");
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Show Workspace", click: showWindow },
      {
        label: "Hide Workspace",
        click: () => mainWindow?.hide(),
      },
      { type: "separator" },
      {
        label: "Open Gmail configuration",
        click: () => {
          const configPath = app.isPackaged
            ? path.join(app.getPath("userData"), ".env")
            : path.join(projectDirectory, ".env");
          void shell.openPath(configPath).then((errorMessage) => {
            if (errorMessage) {
              dialog.showErrorBox("Could not open Gmail configuration", errorMessage);
            }
          });
        },
      },
      { type: "separator" },
      {
        label: "Quit Workspace",
        click: () => app.quit(),
      },
    ]),
  );
  tray.on("double-click", showWindow);
}

function isTrustedAppUrl(value) {
  try {
    const origin = new URL(value).origin;
    return (
      origin === backendUrl ||
      (!app.isPackaged && origin === new URL(devUrl).origin)
    );
  } catch {
    return false;
  }
}

function openExternalLink(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return;
  }
  if (!["http:", "https:", "mailto:"].includes(url.protocol)) return;

  void shell.openExternal(url.toString()).catch((error) => {
    console.error(`Could not open external link: ${error.message}`);
  });
}

function showWindow() {
  if (!mainWindow) {
    if (app.isReady() && backendServer?.listening) createWindow();
    return;
  }
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function receiveOAuthCallback(value) {
  let callback;
  try {
    callback = new URL(value);
  } catch {
    return;
  }

  if (
    callback.protocol !== `${appProtocol}:` ||
    callback.hostname !== "auth" ||
    callback.pathname !== "/callback"
  ) {
    return;
  }

  const challenge = callback.searchParams.get("challenge");
  if (!pendingOAuthChallenge || !timingSafeMatch(challenge, pendingOAuthChallenge)) {
    return;
  }

  const ticket = callback.searchParams.get("ticket");
  const error = callback.searchParams.get("error");
  if ((!ticket && !error) || (ticket && !/^[a-f0-9]{64}$/i.test(ticket))) {
    return;
  }

  clearTimeout(pendingOAuthTimeout);
  pendingOAuthChallenge = undefined;
  pendingOAuthResult = { challenge, ticket, error };
  showWindow();
  deliverOAuthResult();
}

function timingSafeMatch(value, expected) {
  if (typeof value !== "string" || value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

function deliverOAuthResult() {
  if (!pendingOAuthResult || !mainWindow || mainWindow.webContents.isLoading()) {
    return;
  }
  mainWindow.webContents.send("gmail:oauth-complete", pendingOAuthResult);
  pendingOAuthResult = undefined;
}

function showTrayNotification(body) {
  if (!Notification.isSupported()) return;
  new Notification({ title: "Workspace", body }).show();
}
