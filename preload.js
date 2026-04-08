const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getAiMove: (sticksLeft, difficulty) => ipcRenderer.invoke("get-ai-move", sticksLeft, difficulty),
});
