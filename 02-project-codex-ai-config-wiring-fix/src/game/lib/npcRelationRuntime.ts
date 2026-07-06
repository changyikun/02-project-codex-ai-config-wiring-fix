import type {
  NpcActivityEntry,
  NpcActivityPurpose,
  NpcPairRelationState,
  NpcRelationMatrix,
} from '../types';

const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));

export interface NpcInteractionDelta {
  favorDelta: number;
  tensionDelta: number;
  actorStressDelta: number;
  targetStressDelta: number;
}

export const buildNpcPairKey = (leftConsortId: string, rightConsortId: string): string =>
  [leftConsortId, rightConsortId].sort((left, right) => left.localeCompare(right)).join('|');

export const getNpcPairRelation = (
  matrix: NpcRelationMatrix,
  leftConsortId: string,
  rightConsortId: string,
): NpcPairRelationState => {
  const pairKey = buildNpcPairKey(leftConsortId, rightConsortId);
  const [consortAId, consortBId] = pairKey.split('|');
  return (
    matrix[pairKey] ?? {
      pairKey,
      consortAId,
      consortBId,
      favor: 0,
      tension: 0,
    }
  );
};

export const resolveNpcInteractionDelta = (
  purpose: NpcActivityPurpose,
  currentRelation?: Pick<NpcPairRelationState, 'favor' | 'tension'>,
): NpcInteractionDelta => {
  switch (purpose) {
    case 'gift':
      return { favorDelta: 4, tensionDelta: -1, actorStressDelta: 1, targetStressDelta: 0 };
    case 'probe':
      return { favorDelta: 0, tensionDelta: currentRelation && currentRelation.favor >= 25 ? 1 : 3, actorStressDelta: 0, targetStressDelta: 1 };
    case 'win-over':
      return currentRelation && currentRelation.tension <= 35
        ? { favorDelta: 4, tensionDelta: -2, actorStressDelta: 1, targetStressDelta: -1 }
        : { favorDelta: 1, tensionDelta: 3, actorStressDelta: 1, targetStressDelta: 1 };
    case 'gossip':
      return { favorDelta: -1, tensionDelta: 4, actorStressDelta: 0, targetStressDelta: 1 };
    case 'pressure':
      return { favorDelta: -2, tensionDelta: 6, actorStressDelta: 0, targetStressDelta: 3 };
    case 'plot':
      return { favorDelta: -2, tensionDelta: 5, actorStressDelta: 1, targetStressDelta: 1 };
    case 'rest':
    case 'stroll':
    default:
      return { favorDelta: 0, tensionDelta: 0, actorStressDelta: 0, targetStressDelta: 0 };
  }
};

export const upsertNpcPairRelation = (
  matrix: NpcRelationMatrix,
  actorConsortId: string,
  targetConsortId: string,
  purpose: NpcActivityPurpose,
  xunKey: string,
): { matrix: NpcRelationMatrix; delta: NpcInteractionDelta; relation: NpcPairRelationState } => {
  const current = getNpcPairRelation(matrix, actorConsortId, targetConsortId);
  const delta = resolveNpcInteractionDelta(purpose, current);
  const relation: NpcPairRelationState = {
    ...current,
    favor: clamp(current.favor + delta.favorDelta, -100, 100),
    tension: clamp(current.tension + delta.tensionDelta, 0, 100),
    lastInteractionXunKey: xunKey,
    lastInteractionPurpose: purpose,
  };

  return {
    matrix: {
      ...matrix,
      [relation.pairKey]: relation,
    },
    delta,
    relation,
  };
};

export const resolveNpcRelationMatrixForActivities = (
  matrix: NpcRelationMatrix,
  entries: NpcActivityEntry[],
): { matrix: NpcRelationMatrix; deltasByConsortId: Record<string, number>; chronicleLines: string[] } => {
  let nextMatrix = matrix;
  const deltasByConsortId: Record<string, number> = {};
  const chronicleLines: string[] = [];

  entries.forEach((entry) => {
    if (!entry.targetConsortId || entry.actorConsortId === entry.targetConsortId) {
      return;
    }
    if (!['visit-consort', 'social-plot', 'hostile-plot'].includes(entry.intent)) {
      return;
    }

    const result = upsertNpcPairRelation(nextMatrix, entry.actorConsortId, entry.targetConsortId, entry.purpose, entry.xunKey);
    nextMatrix = result.matrix;
    deltasByConsortId[entry.actorConsortId] = (deltasByConsortId[entry.actorConsortId] ?? 0) + result.delta.actorStressDelta;
    deltasByConsortId[entry.targetConsortId] = (deltasByConsortId[entry.targetConsortId] ?? 0) + result.delta.targetStressDelta;
    if (result.delta.favorDelta !== 0 || result.delta.tensionDelta !== 0) {
      const relationEffects = [
        result.delta.favorDelta > 0 ? '关系渐亲' : result.delta.favorDelta < 0 ? '情分转薄' : '',
        result.delta.tensionDelta > 0 ? '嫌隙加深' : result.delta.tensionDelta < 0 ? '嫌隙稍解' : '',
      ].filter(Boolean);
      chronicleLines.push(`${entry.summary}${relationEffects.length > 0 ? ` ${relationEffects.join('，')}。` : ''}`);
    }
  });

  return { matrix: nextMatrix, deltasByConsortId, chronicleLines };
};
