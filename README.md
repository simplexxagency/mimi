# Mimi | Live Avatar Camera for Google Meet and OBS

**Mimi** is a local-first, browser-based animated avatar app. MediaPipe Face Landmarker tracks your facial movements and animates a 2D cartoon, your uploaded portrait, or one of four free rigged 3D characters.

This is the **public, privacy-clean build**. It includes the generic Cartoon 2D avatar and all four standard VTubeMe models: **Nova, Sky, Ember, and Kai**. It does **not** include personal pictures, custom likeness textures, screenshots, or local user data.

## Requirements

- Node.js 22+ and npm
- Chrome or another modern browser with camera access and WebGL
- Webcam (optional for demo mode)
- For Google Meet on Windows: OBS Studio with Virtual Camera, and Google Chrome

## Quick start

```bash
git clone https://github.com/simplexxagency/mimi.git
cd mimi
npm ci
npm run dev
```

The free avatar models and MediaPipe runtime are stored in \`asset-packs/\` as compressed pieces because the GitHub connector limits binary upload size. \`npm ci\` automatically reassembles them into \`public/\` and verifies their SHA-256 checksums. Keep the full \`asset-packs/\` folder if you copy the project.

Open **http://127.0.0.1:5173/** in Chrome. Allow camera access when prompted, then click **Start Camera**. Without a camera, Mimi shows an animated demo.

For a production bundle:

```bash
npm run build
npm run preview
```

On Windows, you can also use `start.bat` to run the regular development app.

## Avatar modes

| Mode | Details |
| --- | --- |
| **Cartoon 2D** | Generic procedural cartoon with eyes, eyebrows, lips, smiles, head motion and blinking |
| **My Portrait** | Upload your own PNG/JPEG/WebP portrait, or a collage of 3–5 views; face landmarks drive localized animation |
| **3D Head** | Nova, Sky, Ember, or Kai with facial morph targets, independent eyelid movement, mouth phonemes, and head rigging |

My Portrait animates an image; it is **not** a photograph-to-3D conversion. The 3D mode uses standard generic GLB models and their original textures. Do not paste selfies onto incompatible UV maps.

Controls include expression intensity, smoothing, transparency, camera preview, calibration, and visemes A/E/I/O/U, MBP, FV, TH.

## Google Meet + OBS (Windows)

1. Install **OBS Studio** and open it.
2. Create a scene and add a **Window Capture** source.
3. Select the browser window titled **Mimi Avatar Output**. Do not capture the settings window.
4. Fit/crop the source to the OBS canvas. Basic Window Capture may include the thin Chrome title bar.
5. Start **OBS Virtual Camera**.
6. In Google Meet settings, select **OBS Virtual Camera**.

Then start Mimi with the Windows helper:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Launch-Mimi-Meet.ps1
```

This starts or reuses the local server, a background Chrome output, and a separate control panel. The output remains **unminimized but parked offscreen**, so OBS continues receiving frames. You can minimize the **controls** panel and speak in Meet normally. Do not minimize/close the output window or shut down OBS/the local server. Windows sleep, screen locking, and some headless sessions can interrupt capture.

If configuring manually, use these two URLs in different Chrome windows:

- Settings/control panel: `http://127.0.0.1:5173/?obs=1`
- Avatar-only video output: `http://127.0.0.1:5173/?obs=output`

The localhost-only bridge (`/__mimi_bridge`) synchronizes controls and face motion while the video output owns the webcam and MediaPipe tracking.

**Launcher note:** It starts OBS if OBS is installed and not already running. You still need to configure the Window Capture source the first time. No private OBS scene configurations are included.

## Privacy

- Camera input is processed locally in the browser. The application does not intentionally upload video frames to a remote service.
- Uploaded portraits are cached **on your own computer**, outside the repository: `%LOCALAPPDATA%\Mimi\portrait-cache\`.
- The separate browser profile lives at `%LOCALAPPDATA%\Mimi\obs-engine-profile\`.
- To remove locally stored portrait data, exit Mimi and delete those directories.
- The bridge listens only on `127.0.0.1`. **Do not expose the Vite development server on a public network.**
- The public source tree excludes selfies, unique face textures, user-specific snapshots, backups, profiles, logs and tests with image captures.

See [PRIVACY.md](PRIVACY.md) for publishing rules.

## Common problems

**Black camera in Meet:** Make sure OBS Virtual Camera is started, OBS points to **Mimi Avatar Output**, and the local output is open. Restart with `Launch-Mimi-Meet.ps1` if needed.

**Avatar freezes when switching tabs:** The controller may be minimized; the output must remain unminimized (the launcher parks it offscreen).

**Portrait not visible:** Select **My Portrait**, upload a file, choose the desired crop, and allow the background output to synchronize.

**No camera permission:** Open from localhost, grant permission, check Windows camera privacy settings, and close programs competing for the webcam.

**3D model missing:** Check the browser console, WebGL support, and loading of files in `public/avatars/`.

## Repository layout

```text
src/
  app.js                 Application UI, MediaPipe tracking and local synchronization
  avatar.js              Procedural cartoon 2D renderer
  portrait.js            Portrait geometry and tracking
  mouth.js               Portrait mouth animation
  head3d_ready.js        Ready-made GLB facial rigs / phonemes
  style.css              UI and broadcast layouts
public/
  avatars/*.glb          4 standard VTubeMe avatars (restored from asset-packs/)
  model/                 Face Landmarker model (restored)
  wasm/                  MediaPipe browser runtime (restored)
asset-packs/             Compressed split standard models and runtime assets\nasset-manifest.json      Checksummed restore manifest\nscripts/restore-assets.mjs  Restores public assets during npm ci\nvite.config.js           Vite and local controller/output relay
Launch-Mimi-Meet.ps1     Windows OBS launcher
AI_PROMPT.md             Instructions for an AI coding agent
CREDITS.md               Model license and attribution
PRIVACY.md               Publishing exclusions
```

## For developers

```bash
npm ci
npm run build
```

Keep camera capture independent of the settings window in OBS mode. Preserve morph targets and avoid committing personal images. A ready-to-copy development prompt is in [AI_PROMPT.md](AI_PROMPT.md).

## Credits

The four standard GLB avatars are provided by **VTubeMe**, licensed under **Creative Commons Attribution 4.0**. Redistribution and adaptation require appropriate credit. See [CREDITS.md](CREDITS.md) and the [original download page](https://vtubeme.com/free-vrm-avatars).

Mimi also uses MediaPipe Tasks Vision, Three.js, Vite, and other dependencies under their respective licenses. No license to reproduce anybody's personal likeness is included.
