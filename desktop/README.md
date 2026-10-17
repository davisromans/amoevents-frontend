# AmoEditor Desktop

AmoEditor Desktop packages the same offline-capable editor used by AmoEvents in an Electron desktop shell.

Use Node.js 22.12 or newer to install and package the current Electron runtime.

- Native Open, Save and Save As dialogs for `.amo` projects.
- Local project files continue working without internet.
- AmoEvents authentication, cloud templates, uploaded assets and publishing use the production API when online.
- Linked layer editor tabs remain inside the desktop application.

From the frontend repository:

```sh
npm run build
npm --prefix desktop install
npm run desktop:dev
```

Create distributable macOS, Windows or Linux packages with:

```sh
npm run desktop:dist
```

Set `AMOEDITOR_API_ORIGIN` before launching to connect a development desktop build to another AmoEvents server.
