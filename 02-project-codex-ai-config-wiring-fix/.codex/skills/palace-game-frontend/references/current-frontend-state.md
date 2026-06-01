# Current Frontend State

## Playable Chain

The current browser chain is:

1. `StartScene`
2. `RouteSelectionView`
3. `AttributeAssignmentView`
4. `OpeningDialogueView`
5. `MapMainView`
6. `ChamberMainView`

This chain is routed by `src/App.tsx` through `currentView`.

## File Map

Core flow:
- `src/App.tsx`
- `src/game/store/gameFlowStore.ts`
- `src/game/types.ts`

Route and UI config:
- `src/game/data/routeProfiles.ts`
- `src/config/palaceUi.ts`

Scene views:
- `src/views/StartScene.tsx`
- `src/views/RouteSelectionView.tsx`
- `src/views/AttributeAssignmentView.tsx`
- `src/views/OpeningDialogueView.tsx`
- `src/views/MapMainView.tsx`
- `src/views/ChamberMainView.tsx`

Shared UI:
- `src/components/status/PalaceStatusBar.tsx`
- `src/index.css`

Tests:
- `src/__tests__/app-flow.test.tsx`

## Hidden Stats Rule

These values are initialized in the background and must stay invisible in:
- route selection
- attribute assignment

Do not expose:
- `silver`
- `prestige`
- `trueHeart`
- other hidden backend-only labels or evaluations

## Shared UI Constants

These are already treated as cross-view constants:

- `PalaceStatusBar` in the top-right corner
- Shared palace dialogue box sizing between opening and chamber
- A `16:9` stage shell
- Left-side vertical diamond nav on map and chamber

The final CSS authority currently lives in the late override block near the bottom of `src/index.css`.

## Runtime Assets in Use

Backgrounds and frames are mapped into `public/assets/`.
Important examples already wired into the frontend:

- Player portraits:
  - `public/assets/player/lanyinxuguo-cutout.png`
  - `public/assets/player/ningxiaoman-cutout.png`
- Dialogue/time assets:
  - `public/assets/dialogue/dialog-box-final.png`
  - `public/assets/dialogue/time-status-user.jpg`
- Route assets:
  - `public/assets/routes/labels/*`
  - `public/assets/routes/buttons/*`

When the user names a source under `picture/`, update or regenerate the matching runtime asset under `public/assets/` instead of wiring raw source files directly into production UI.

## Current Scene Expectations

### Route Selection
- Left side uses four vertical route labels.
- Right side uses a detail card with quote, editable name, biography, requirement, difficulty, and confirm button.

### Attribute Assignment
- Uses the selected route portrait.
- Fixed routes show `剩余点数：已固定`.
- Random buttons for age/family are custom image-style controls.

### Opening Dialogue
- Uses Jiaojiao guide lines, then 3 opening tendency options.
- After the player chooses one option, route to the map guide.

### Map
- Uses painted palace map background.
- Buildings are independent clickable hotspots.
- Left sidebar buttons are always visible.
- Hotspot style should stay close to the paper labels in `地图ui.jpg`.

### Chamber
- Uses the bedroom background, left sidebar, title chips, portrait stage, skill panel, 3x3 action grid, and bottom tools.
- Bottom dialogue should visually match the opening dialogue family.

## Validation

Minimum validation after changes:

```powershell
npm run build:web
npx vitest run src/__tests__/app-flow.test.tsx
```

When doing visual work, also refresh the local preview if the user is actively reviewing `http://127.0.0.1:4173/`.
