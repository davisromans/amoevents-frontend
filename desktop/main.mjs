import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron';
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ownDirectory = path.dirname(fileURLToPath(import.meta.url));
const isPackaged = app.isPackaged;
const webRoot = isPackaged ? path.join(process.resourcesPath, 'web') : path.resolve(ownDirectory, '../dist');
const apiOrigin = new URL(process.env.AMOEDITOR_API_ORIGIN || 'https://events.amoview.com');
let server;
let serverOrigin;
let mainWindow;
let currentProjectPath = null;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm',
};

function proxyRequest(request, response) {
  const transport = apiOrigin.protocol === 'http:' ? http : https;
  const upstream = transport.request({
    protocol: apiOrigin.protocol, hostname: apiOrigin.hostname, port: apiOrigin.port || (apiOrigin.protocol === 'http:' ? 80 : 443),
    method: request.method, path: request.url,
    headers: { ...request.headers, host: apiOrigin.host, origin: apiOrigin.origin },
  }, (upstreamResponse) => {
    response.writeHead(upstreamResponse.statusCode || 502, upstreamResponse.headers);
    upstreamResponse.pipe(response);
  });
  upstream.on('error', (error) => { response.writeHead(502, { 'Content-Type': 'application/json' }); response.end(JSON.stringify({ error: { message: error.message } })); });
  request.pipe(upstream);
}

function serveWeb(request, response) {
  if (request.url.startsWith('/api/') || request.url.startsWith('/files/')) { proxyRequest(request, response); return; }
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  const candidate = path.resolve(webRoot, `.${pathname}`);
  const safeCandidate = (candidate === webRoot || candidate.startsWith(`${webRoot}${path.sep}`)) ? candidate : path.join(webRoot, 'index.html');
  const filePath = fs.existsSync(safeCandidate) && fs.statSync(safeCandidate).isFile() ? safeCandidate : path.join(webRoot, 'index.html');
  response.writeHead(200, {
    'Content-Type': mimeTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': filePath.endsWith('index.html') ? 'no-store' : 'public, max-age=31536000, immutable',
  });
  fs.createReadStream(filePath).pipe(response);
}

async function startServer() {
  server = http.createServer(serveWeb);
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  serverOrigin = `http://127.0.0.1:${server.address().port}`;
}

function sendMenu(command) { mainWindow?.webContents.send('menu:command', command); }

function installMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'File', submenu: [
        { label: 'Open AmoEditor Project…', accelerator: 'CmdOrCtrl+O', click: () => sendMenu('open-project') },
        { type: 'separator' },
        { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => sendMenu('save-project') },
        { label: 'Save Project As…', accelerator: 'CmdOrCtrl+Shift+S', click: () => sendMenu('save-project-as') },
        { type: 'separator' },
        { role: process.platform === 'darwin' ? 'close' : 'quit' },
      ],
    },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { label: 'Window', submenu: [{ role: 'minimize' }, { role: 'zoom' }, { role: 'front' }] },
  ]));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600, height: 1000, minWidth: 1100, minHeight: 720, title: 'AmoEditor',
    backgroundColor: '#111111',
    webPreferences: { preload: path.join(ownDirectory, 'preload.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith(serverOrigin)) return { action: 'allow', overrideBrowserWindowOptions: { width: 1400, height: 900, webPreferences: { preload: path.join(ownDirectory, 'preload.mjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } } };
    shell.openExternal(url); return { action: 'deny' };
  });
  await mainWindow.loadURL(`${serverOrigin}/studio/templates/new`);
}

ipcMain.handle('project:open', async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'AmoEditor Project', extensions: ['amo'] }] });
  if (result.canceled || !result.filePaths[0]) return null;
  currentProjectPath = result.filePaths[0];
  return { name: path.basename(currentProjectPath), bytes: new Uint8Array(await fs.promises.readFile(currentProjectPath)) };
});

ipcMain.handle('project:save', async (_event, payload = {}) => {
  let destination = payload.saveAs ? null : currentProjectPath;
  if (!destination) {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: payload.suggestedName || 'Untitled.amo', filters: [{ name: 'AmoEditor Project', extensions: ['amo'] }],
    });
    if (result.canceled || !result.filePath) return { canceled: true };
    destination = result.filePath.endsWith('.amo') ? result.filePath : `${result.filePath}.amo`;
  }
  await fs.promises.writeFile(destination, Buffer.from(payload.bytes));
  currentProjectPath = destination;
  return { canceled: false, path: destination, name: path.basename(destination) };
});

app.whenReady().then(async () => {
  await startServer(); installMenu(); await createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('before-quit', () => server?.close());
