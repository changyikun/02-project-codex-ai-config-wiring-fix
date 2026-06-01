// Gameplay is local-rule first. AI hooks stay in the codebase, but are not part of the default playable loop.
export const ENABLE_REALTIME_AI_GAMEPLAY = false;

export const shouldUseRealtimeAiGameplay = (): boolean => ENABLE_REALTIME_AI_GAMEPLAY;
