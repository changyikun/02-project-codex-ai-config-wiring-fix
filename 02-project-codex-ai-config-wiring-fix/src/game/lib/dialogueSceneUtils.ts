export const trimDialogueHistory = <T>(history: T[], limit = 6): T[] => history.slice(-limit);

export const clampToRange = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const createDialogueId = (prefix: string): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};
