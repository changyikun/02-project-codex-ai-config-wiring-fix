import { renderNarrativeEntry, type NarrativeEntry } from '../narrative/narrativeCatalog';

type ChamberActionNarrativeInput = {
  actionId: string;
  actionLabel: string;
  actionSummary: string;
  playerName?: string;
  residenceName: string;
  timeLabel: string;
};

type MapTransitionNarrativeInput =
  | {
      kind: 'enter-map';
      fromResidence: string;
    }
  | {
      kind: 'inspect-location';
      locationName: string;
      locationDescription?: string;
    }
  | {
      kind: 'enter-location';
      locationName: string;
    }
  | {
      kind: 'return-chamber';
      fromLocation?: string;
      residenceName: string;
    };

type XunTransitionNarrativeInput = {
  currentMonth: number;
  currentXun: number;
};

type LocationActionNarrativeInput = {
  locationId: string;
  actionId: string;
  actionLabel: string;
  resultText?: string;
};

const chamberActionNarrativeIdByAction: Record<string, string> = {
  study: 'chamber.action.study',
  painting: 'chamber.action.painting',
  music: 'chamber.action.music',
  embroidery: 'chamber.action.embroidery',
  incense: 'chamber.action.incense',
  rest: 'chamber.action.rest',
};

export function buildChamberActionNarrativeEntry(input: ChamberActionNarrativeInput): NarrativeEntry {
  return renderNarrativeEntry(chamberActionNarrativeIdByAction[input.actionId] ?? 'chamber.action.default', {
    actionLabel: input.actionLabel,
    actionSummary: input.actionSummary,
    playerName: input.playerName ?? '你',
    residenceName: input.residenceName,
    timeLabel: input.timeLabel,
  });
}

export function buildChamberActionNarrative(input: ChamberActionNarrativeInput): string {
  return buildChamberActionNarrativeEntry(input).text;
}

export function buildMapTransitionNarrativeEntry(input: MapTransitionNarrativeInput): NarrativeEntry {
  switch (input.kind) {
    case 'enter-map':
      return renderNarrativeEntry('map.transition.enter-map', { fromResidence: input.fromResidence });
    case 'inspect-location':
      return input.locationDescription
        ? renderNarrativeEntry('map.transition.inspect-location.with-description', {
            locationName: input.locationName,
            locationDescription: input.locationDescription,
          })
        : renderNarrativeEntry('map.transition.inspect-location.default', { locationName: input.locationName });
    case 'enter-location':
      return renderNarrativeEntry('map.transition.enter-location', { locationName: input.locationName });
    case 'return-chamber':
      return input.fromLocation
        ? renderNarrativeEntry('map.transition.return-chamber.from-location', {
            fromLocation: input.fromLocation,
            residenceName: input.residenceName,
          })
        : renderNarrativeEntry('map.transition.return-chamber.default', { residenceName: input.residenceName });
    default: {
      const exhaustive: never = input;
      return exhaustive;
    }
  }
}

export function buildMapTransitionNarrative(input: MapTransitionNarrativeInput): string {
  return buildMapTransitionNarrativeEntry(input).text;
}

export function buildXunTransitionNarrativeEntry(input: XunTransitionNarrativeInput): NarrativeEntry {
  return renderNarrativeEntry('xun.transition.end', {
    currentMonth: input.currentMonth,
    currentXun: input.currentXun,
  });
}

export function buildXunTransitionNarrative(input: XunTransitionNarrativeInput): string {
  return buildXunTransitionNarrativeEntry(input).text;
}

const locationActionNarrativeIdByAction: Record<string, string> = {
  'kitchen:stroll': 'location.action.kitchen.stroll',
  'kitchen:buy': 'location.action.kitchen.buy',
  'kitchen:meet': 'location.action.kitchen.meet',
  'tai-hospital:stroll': 'location.action.tai-hospital.stroll',
  'tai-hospital:consultation': 'location.action.tai-hospital.consultation',
  'tai-hospital:meet': 'location.action.tai-hospital.meet',
  'miaoyin-hall:listen': 'location.action.miaoyin-hall.listen',
  'miaoyin-hall:stroll': 'location.action.miaoyin-hall.stroll',
  'miaoyin-hall:sign-up': 'location.action.miaoyin-hall.sign-up',
  'miaoyin-hall:practice': 'location.action.miaoyin-hall.practice',
  'miaoyin-hall:meet': 'location.action.miaoyin-hall.meet',
  'baohua-hall:worship': 'location.action.baohua-hall.worship',
  'baohua-hall:pray': 'location.action.baohua-hall.pray',
  'baohua-hall:stroll': 'location.action.baohua-hall.stroll',
  'baohua-hall:meet': 'location.action.baohua-hall.meet',
  'imperial-garden:garden-stroll': 'location.action.imperial-garden.garden-stroll',
  'imperial-garden:listen-rumors': 'location.action.imperial-garden.listen-rumors',
  'zhengyang-gate:watch-court-road': 'location.action.zhengyang-gate.watch-court-road',
  'chonghua-palace:read-lessons': 'location.action.chonghua-palace.read-lessons',
  'cold-palace:search-old-traces': 'location.action.cold-palace.search-old-traces',
  'yangxin-hall:wait-at-steps': 'location.action.yangxin-hall.wait-at-steps',
  'yangxin-hall:copy-notes': 'location.action.yangxin-hall.copy-notes',
};

export function buildLocationActionNarrativeEntry(input: LocationActionNarrativeInput): NarrativeEntry {
  return renderNarrativeEntry(locationActionNarrativeIdByAction[`${input.locationId}:${input.actionId}`] ?? 'location.action.default', {
    actionLabel: input.actionLabel,
    locationId: input.locationId,
    resultText: input.resultText ?? '',
  });
}

export function buildLocationActionNarrative(input: LocationActionNarrativeInput): string {
  return buildLocationActionNarrativeEntry(input).text;
}
