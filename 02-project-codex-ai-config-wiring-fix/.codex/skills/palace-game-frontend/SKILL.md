---
name: palace-game-frontend
description: Continue the 凤华录 browser game's frontend in this repo. Use when editing the React/TypeScript/CSS scene flow, palace UI, route selection, attribute assignment, opening guide, map, chamber, runtime assets, or the dual-AI integration boundaries under `src/`, `public/assets/`, and project-local `.codex/skills`. Preserve the current playable chain, hidden-stat rules, 16:9 stage layout, constant status bar, and AI-independent hard-rule flow.
---

# Palace Game Frontend

Keep this skill focused on the current playable frontend and its non-negotiable boundaries.

## Workflow

1. Rebuild local context from code first.
   Read only the files that govern the current chain:
   - `src/App.tsx`
   - `src/game/store/gameFlowStore.ts`
   - `src/game/data/routeProfiles.ts`
   - `src/config/palaceUi.ts`
   - `src/views/StartScene.tsx`
   - `src/views/RouteSelectionView.tsx`
   - `src/views/AttributeAssignmentView.tsx`
   - `src/views/OpeningDialogueView.tsx`
   - `src/views/MapMainView.tsx`
   - `src/views/ChamberMainView.tsx`
   - `src/index.css`

2. Preserve the current scene chain.
   The obvious path is:
   - `start`
   - `route-selection`
   - `attribute-assignment`
   - `opening-dialogue`
   - `map-main`
   - `bedchamber`

3. Treat frontend constants as hard constraints unless the user explicitly changes them.
   - The game uses a `16:9` horizontal stage.
   - The top-right status bar is a constant component shared across views.
   - Route selection and attribute assignment must never reveal hidden values such as `silver`, `prestige`, or `trueHeart`.
   - Opening dialogue and chamber dialogue must use the same dialogue-box system and constant dimensions.
   - Map hotspots must match the painted-paper vertical labels from the reference UI and must not overlap the status bar.
   - Player portraits should use transparent cutouts when assets allow it.

4. Keep the game playable without AI.
   - Hard rules and numeric changes stay local.
   - If AI is unavailable, the flow must still run with local copy and local option metadata.

5. Validate after meaningful changes.
   Run:
   ```powershell
   npm run build:web
   npx vitest run src/__tests__/app-flow.test.tsx
   ```
   If the user is actively previewing the UI, refresh the local browser target after major frontend changes.

## Dual AI Boundary

- `narrative-text-ai`
  - Use only for text expansion, dialogue polish, option wording, notifications, and narrative packaging.
- `relationship-judge-ai`
  - Use only to classify player dialogue intent such as `friendly`, `flirt`, `neutral`, `cold`, `reject`.
  - System code applies the actual numeric delta.
- Do not let either AI decide hard-rule numbers, route legality, status changes, pregnancy, palace-strife outcomes, rank math, or hidden-stat initialization.

## Read These References When Needed

- For the current implemented frontend state, file map, assets, and CSS authority:
  - `references/current-frontend-state.md`
- For hidden-value rules and dual-AI constraints that the UI must not violate:
  - `references/ai-boundaries.md`

## Editing Rules

- Prefer updating the existing flow and assets over inventing new parallel structures.
- Treat the late override block at the bottom of `src/index.css` as the final authority for shared palace UI constants unless you intentionally refactor it.
- When a UI request conflicts with hard-rule docs, stop guessing and read the relevant project docs under `docs/` or `game word/` before changing behavior.
