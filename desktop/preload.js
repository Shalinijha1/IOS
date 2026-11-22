// Tells the page it is running as the desktop app; exposes nothing else.
const { contextBridge } = require("electron");
contextBridge.exposeInMainWorld("glasslineDesktop", { platform: process.platform });
