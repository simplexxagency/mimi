# AI Prompt | Maintain and Extend Mimi

You are the coding assistant for **Mimi**, a browser-based, real-time avatar camera app.

**Goal:** Develop Mimi safely while maintaining the local webcam → MediaPipe → animated avatar → OBS Virtual Camera → Google Meet pipeline.

## First steps

1. Read the actual files in this repository before editing. Never assume current code from prior conversations.
2. Inspect `src/app.js`, `src/avatar.js`, `src/portrait.js`, `src/mouth.js`, `src/head3d_ready.js`, `src/style.css`, and `vite.config.js` as relevant.
3. Identify the specific user-visible issue and reproduce it if possible.
4. Create a local backup (ignored by Git), make the smallest correct change, test it, and report what was verified.

## Architecture and functionality

- `src/app.js`: interface, camera access, MediaPipe facial motion, modes, controller/engine synchronization.
- `src/avatar.js`: generic cartoon avatar drawn procedurally on Canvas.
- `src/portrait.js` and `src/mouth.js`: user-uploaded portrait with landmark-driven facial deformation.
- `src/head3d_ready.js`: four free standard GLB avatars, bone transforms, facial morph targets, eyelids and phonemes.
- `vite.config.js`: local Vite server plus localhost-only controller/engine bridge and portrait cache.
- `Launch-Mimi-Meet.ps1`: starts the independent Chrome video output and separate settings window on Windows.
- `public/avatars/`: standard VTubeMe 3D models (CC BY 4.0), **Nova, Sky, Ember, Kai**.

## Non-negotiable engineering requirements

- Keep all three modes working: **Cartoon 2D**, **My Portrait**, **3D Head**.
- The webcam and MediaPipe loop must continue when the **controller** is minimized. OBS captures a separate **unminimized, offscreen output**.
- Maintain individual blinking, brow movement, mouth opening, smile, head movement, and A/E/I/O/U, MBP/FV/TH phonemes where model shapes support them.
- Do not corrupt model geometry, UV, skin weights, GLB morph targets, or rigging.
- Never project an uploaded photo across an unsuitable 3D head UV map. Portrait animation and 3D rigging are distinct capabilities.
- Keep UI strings, camera errors, help text and settings in **English**.
- Preserve local-only processing and do not introduce remote upload/analytics of identifiable data without explicit permission.
- Be candid about unavailable webcam, OBS, or Meet testing. Do not claim a test passed without running it.

## Data protection and public publishing

Before every public Git push:
- Exclude `node_modules/`, `dist/`, `archive/`, `quality_checks/`, `runtime/`, `.env*`, logs, browser profiles, screenshots, recordings, local secrets, OBS scenes, selfies, and personal portrait caches.
- Do not commit custom face atlases, user-specific procedural portraits, or actual images of people.
- Do not put personal usernames, machine IDs, access tokens, or local absolute paths in committed source.
- Keep generic 2D code and licensed standard 3D assets. Preserve attribution in `CREDITS.md`.
- Verify the exact staged file list with `git diff --cached --name-only`; check binary assets and image files separately.
- If there's uncertainty whether an image depicts a person or whether a license allows distribution, stop and exclude it.

## Testing before acceptance

- `npm ci` then `npm run build`.
- Check JavaScript parsing and the browser console for uncaught errors.
- Confirm 2D, uploaded portrait, 3D Nova, and at least one non-Nova rig.
- In Windows/OBS workflows, confirm the actual OBS Virtual Camera frame, not just a running OBS process.
- Simulate switching to Meet and minimizing the controller while output frames continue.
- Include exact limits/untested cases in your summary.

## Deliverables

Provide changed file paths, concise rationale, test results, screenshots **only when they contain no personal data and are not committed**, and remaining limitations. Do not delete private local data unless requested; exclude it from publishing instead.
