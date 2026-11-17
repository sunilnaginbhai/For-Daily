const { contextBridge, ipcRenderer } = require("electron");

let authCallback;
let pendingAuthResult;

ipcRenderer.on("gmail:oauth-complete", (_event, result) => {
  if (authCallback) {
    authCallback(result);
  } else {
    pendingAuthResult = result;
  }
});

contextBridge.exposeInMainWorld(
  "workspaceDesktop",
  Object.freeze({
    isDesktop: true,
    platform: process.platform,
    getVersion: () => ipcRenderer.invoke("desktop:version"),
    connectGmail: () => ipcRenderer.invoke("gmail:connect"),
    showNotification: (title, body) =>
      ipcRenderer.invoke("desktop:notify", { title, body }),
    onGmailAuthComplete: (callback) => {
      if (typeof callback !== "function") {
        throw new TypeError("The Gmail authorization callback must be a function.");
      }

      authCallback = callback;
      if (pendingAuthResult) {
        const result = pendingAuthResult;
        pendingAuthResult = undefined;
        queueMicrotask(() => callback(result));
      }

      return () => {
        if (authCallback === callback) authCallback = undefined;
      };
    },
  }),
);
