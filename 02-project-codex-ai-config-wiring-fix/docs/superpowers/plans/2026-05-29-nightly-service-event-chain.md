# Nightly Service Event Chain Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn player-selected nightly service from an automatic report into a playable chain: eunuch notice, Yangxin interaction, three feedback beats, formal service text, black overnight transition, and settlement report.

**Architecture:** Keep hard selection and hard settlement in `nightlyServiceRuntime`, but split them for the player path. Xun transition creates a pending player service event; `ChamberMainView` owns the presentation flow and calls a store action to finalize settlement after the three interactions.

**Tech Stack:** React, Zustand, Vitest, Testing Library.

---

### Task 1: Runtime Split

**Files:**
- Modify: `src/game/types.ts`
- Modify: `src/game/lib/nightlyServiceRuntime.ts`
- Test: `src/game/lib/nightlyServiceRuntime.test.ts`

- [x] Add pending player event and finalized settlement types to `NightlyServiceState`.
- [x] Add tests proving player selection can be deferred without applying favor/true-heart/prestige immediately.
- [x] Add tests proving three documented interactions produce final interest and settlement effects.

### Task 2: Store Wiring

**Files:**
- Modify: `src/game/store/gameFlowStore.ts`
- Test: `src/game/store/gameFlowStore.save.test.ts`

- [x] During xun transition, store a pending player nightly service event instead of immediate player settlement.
- [x] Add `finalizePendingNightlyService(actionIds)` to apply final effects, report lines, gauge reset, and settlement report.
- [x] Keep NPC service and emperor-alone as existing automatic settlement reports.

### Task 3: UI Chain

**Files:**
- Create: `src/components/chamber/NightlyServiceEventView.tsx`
- Modify: `src/views/ChamberMainView.tsx`
- Modify: `src/index.css`
- Test: `src/__tests__/app-flow.test.tsx`

- [x] Render eunuch notice first when pending event exists.
- [x] Then render Yangxin interaction page with five documented options.
- [x] Play feedback text after each of three choices.
- [x] Render formal service text, then black overnight transition.
- [x] After black transition, call finalization and let the normal settlement dialogue appear.

### Task 4: Verification

**Files:**
- Run: `npm test -- nightlyServiceRuntime`
- Run: `npm test -- gameFlowStore.save`
- Run: targeted app-flow test for nightly service

- [x] Confirm all touched behavior passes automated tests.
