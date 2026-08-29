# XPolicyLab Data Studio

A local-first React + Ant Design review console for filtering XPolicyLab multi-camera trajectories. It plays the head, left-wrist, and right-wrist videos on one synchronized timeline and records episode-level screening decisions.

## Features

- Three synchronized HTML5 video views with a head-camera overview and two wrist-camera views.
- Play/pause, playback rate, timeline seeking, and 30 FPS frame stepping across all cameras.
- Keep, review, reject, notes, queue filters, keyboard shortcuts, and JSON export.
- Local folder import; video bytes stay in the browser and are never uploaded.
- Review decisions and notes persist in browser local storage.
- Responsive desktop/tablet/mobile layout built with Ant Design.

The bundled dataset catalog is representative UI data. Import a real video folder to start a local review session.

## Run locally

```bash
cd tools/data-studio
npm ci
npm run dev
```

## Expected video layout

The importer recognizes `episode_<number>` plus head/left-wrist/right-wrist camera names in either directory or file names. For example:

```text
my-dataset/
├── episode_001/
│   ├── cam_head.mp4
│   ├── cam_left_wrist.mp4
│   └── cam_right_wrist.mp4
└── episode_002/
    ├── cam_head.mp4
    ├── cam_left_wrist.mp4
    └── cam_right_wrist.mp4
```

The camera matcher also accepts `front`, `left_cam`, `right_cam`, or paths containing both `left|right` and `wrist`. MP4 and WebM provide the broadest browser compatibility.

## Production build

```bash
npm run build
npm run preview
```

The static `dist/` output can be served alongside a training container or from any ordinary web server. Folder access uses browser object URLs, so no data-management backend is required for the initial screening workflow.

## Review export

`Export review` downloads a JSON array with:

```json
{
  "dataset": "my-dataset",
  "episode": "episode_001",
  "decision": "Keep",
  "note": "Clean grasp and synchronized streams."
}
```

This deliberately keeps the frontend independent of a particular deletion or dataset-indexing API. A later backend can consume the JSON or replace the local storage adapter.
