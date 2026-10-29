const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("leadjaWhatsapp", {
  show: (bounds, chatUrl = "") => ipcRenderer.invoke("whatsapp:show", { bounds, chatUrl }),
  setBounds: (bounds) => ipcRenderer.invoke("whatsapp:bounds", bounds),
  hide: () => ipcRenderer.invoke("whatsapp:hide"),
  reload: () => ipcRenderer.invoke("whatsapp:reload"),
  onStatus: (callback) => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on("whatsapp:status", listener);
    return () => ipcRenderer.removeListener("whatsapp:status", listener);
  },
});

contextBridge.exposeInMainWorld("leadjaShare", {
  open: (value) => ipcRenderer.invoke("lead:share", value),
});
