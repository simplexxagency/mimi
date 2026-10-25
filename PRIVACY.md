# Privacy and Publishing Policy

This is the **generic public-source edition** of Mimi. It intentionally includes only software and assets needed to run the app.

## Included

- Canvas-based generic **Cartoon 2D** avatar.
- Free standard 3D **Nova, Sky, Ember, Kai** GLB models from VTubeMe, with license attribution.
- MediaPipe runtime, generic facial-landmarker model, app source, package manifest, launcher, and documentation.

## Not included

- Personal selfies, uploaded portraits, likeness references, face mosaics or collages.
- Customized head textures or personalized body/face meshes, including private Nova UV atlases.
- Google Meet screenshots, recording frames, private test reports or diagnostics.
- OBS user profiles/scenes, Chrome profiles, session cookies, credentials, or local Windows paths.
- `node_modules/`, `dist/`, `archive/`, `quality_checks/`, `runtime/`, build artifacts, or local logs.

## Local runtime data

The app caches a selected portrait at `%LOCALAPPDATA%\Mimi\portrait-cache\`. A separate Chrome profile for the OBS rendering engine is at `%LOCALAPPDATA%\Mimi\obs-engine-profile\`. Neither path is inside this repository. To erase the local cache, stop Mimi and remove the folders yourself.

Webcam tracking runs locally. Only serialized facial pose data and controls are shared between two **local** Mimi windows over `127.0.0.1`; the app does not intentionally transmit webcam video to a remote service.

## Security boundaries

The Vite localhost relay is intended for the user's own desktop. It is not authenticated as a production multiuser service and must not be made publicly reachable. Do not deploy it to a public host without redesigning the image-upload and bridge authorization.

## Third-party models

The standard VTubeMe avatars are licensed CC BY 4.0, requiring attribution. See `CREDITS.md`. The license for these generic assets does not grant permission to publish a user's face or image.

Before each release, review `git status`, inspect staged files and run a credential/personal-data scan. Do not assume that `.gitignore` alone catches every sensitive asset.
