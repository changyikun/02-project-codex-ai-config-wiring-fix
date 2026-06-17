import openingDialoguesCsv from './csv/opening_dialogues.csv?raw';
import mapChamberDialoguesCsv from './csv/map_chamber_dialogues.csv?raw';
import routeMainlineDialoguesCsv from './csv/route_mainline_dialogues.csv?raw';
import locationEncountersCsv from './csv/location_encounters.csv?raw';
import relationshipAudiencesCsv from './csv/relationship_audiences.csv?raw';
import emperorYangxinDialoguesCsv from './csv/emperor_yangxin_dialogues.csv?raw';
import palaceStrifeVerdictCsv from './csv/palace_strife_verdict.csv?raw';
import npcToolsDialoguesCsv from './csv/npc_tools_dialogues.csv?raw';
import {
  findUnresolvedNarrativeVariables,
  loadNarrativeEntries,
  renderNarrativeEntryTemplate,
  renderNarrativeTemplate,
  type NarrativeEntry,
  type NarrativeVariables,
} from './csvNarrativeLoader';

export type NarrativeCriteria = Partial<
  Pick<NarrativeEntry, 'routeId' | 'locationId' | 'actorKey' | 'actionId' | 'variant'>
>;

const narrativeSources = {
  'opening_dialogues.csv': openingDialoguesCsv,
  'map_chamber_dialogues.csv': mapChamberDialoguesCsv,
  'route_mainline_dialogues.csv': routeMainlineDialoguesCsv,
  'location_encounters.csv': locationEncountersCsv,
  'relationship_audiences.csv': relationshipAudiencesCsv,
  'emperor_yangxin_dialogues.csv': emperorYangxinDialoguesCsv,
  'palace_strife_verdict.csv': palaceStrifeVerdictCsv,
  'npc_tools_dialogues.csv': npcToolsDialoguesCsv,
};

export const narrativeEntries = loadNarrativeEntries(narrativeSources);

const narrativeEntryById = new Map(narrativeEntries.map((entry) => [entry.id, entry]));

export const getNarrativeEntry = (id: string): NarrativeEntry => {
  const entry = narrativeEntryById.get(id);
  if (!entry) {
    throw new Error(`Unknown narrative id "${id}".`);
  }
  return entry;
};

export const renderNarrativeText = (id: string, variables: NarrativeVariables = {}): string =>
  renderNarrativeTemplate(getNarrativeEntry(id).text, variables);

export const renderNarrativeEntry = (id: string, variables: NarrativeVariables = {}): NarrativeEntry =>
  renderNarrativeEntryTemplate(getNarrativeEntry(id), variables);

export const pickNarrativeEntry = (group: string, criteria: NarrativeCriteria = {}): NarrativeEntry | undefined => {
  const candidates = narrativeEntries
    .filter((entry) => entry.group === group)
    .filter((entry) =>
      (Object.entries(criteria) as Array<[keyof NarrativeCriteria, string | undefined]>).every(([key, value]) => {
        if (!value) {
          return true;
        }
        return !entry[key] || entry[key] === value;
      }),
    )
    .sort((left, right) => Number(left.order || 0) - Number(right.order || 0));

  return candidates[0];
};

export const assertNoUnresolvedNarrativeVariables = (text: string): void => {
  const unresolved = findUnresolvedNarrativeVariables(text);
  if (unresolved.length > 0) {
    throw new Error(`Unresolved narrative variables: ${unresolved.join(', ')}`);
  }
};

export type { NarrativeEntry, NarrativeVariables } from './csvNarrativeLoader';
