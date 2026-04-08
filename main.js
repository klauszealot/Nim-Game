const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const { spawn } = require("child_process");

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: "Nim Game",
    icon: path.join(__dirname, "icons", "win", "icon.ico"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
    show: false,
    backgroundColor: "#0b1326",
  });

  win.loadFile("index.html");

  win.once("ready-to-show", () => {
    win.show();
  });

  // Remove default menu bar
  win.setMenuBarVisibility(false);
}

ipcMain.handle("get-ai-move", (event, sticksLeft, difficulty) => {
  return new Promise((resolve, reject) => {
    let aiProcess;
    
    if (app.isPackaged) {
      const aiPath = path.join(process.resourcesPath, "ai_engine.exe");
      aiProcess = spawn(aiPath);
    } else {
      const aiPath = path.join(__dirname, "ai_engine.py");
      aiProcess = spawn("python", [aiPath]);
    }

    const inputData = { sticksLeft, difficulty };
    let outputData = "";

    aiProcess.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    aiProcess.stderr.on("data", (data) => {
      console.error(`AI Engine Error: ${data}`);
    });

    aiProcess.on("close", (code) => {
      try {
        const result = JSON.parse(outputData);
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result);
        }
      } catch (err) {
        reject(new Error("Failed to parse AI response: " + err.message + "\nRaw output: " + outputData));
      }
    });

    aiProcess.stdin.write(JSON.stringify(inputData));
    aiProcess.stdin.end();
  });
});

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
