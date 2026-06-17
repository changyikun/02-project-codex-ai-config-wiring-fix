export type NarrativePortraitPlacement = '' | 'stage' | 'dialogue-left';

export interface NarrativeEntry {
  id: string;
  group: string;
  routeId: string;
  locationId: string;
  actorKey: string;
  actionId: string;
  variant: string;
  order: string;
  speakerIdentity: string;
  speakerName: string;
  portraitKey: string;
  portraitPlacement: NarrativePortraitPlacement;
  narrationName: string;
  text: string;
  sceneHint: string;
  notes: string;
  sourceFile: string;
}

export type NarrativeVariables = Record<string, string | number | boolean | null | undefined>;

export const NARRATIVE_CSV_COLUMNS = [
  'id',
  'group',
  'routeId',
  'locationId',
  'actorKey',
  'actionId',
  'variant',
  'order',
  'speakerIdentity',
  'speakerName',
  'portraitKey',
  'portraitPlacement',
  'narrationName',
  'text',
  'sceneHint',
  'notes',
] as const;

type NarrativeCsvColumn = (typeof NARRATIVE_CSV_COLUMNS)[number];
type NarrativeTemplateColumn = Exclude<NarrativeCsvColumn, 'portraitPlacement'>;

const REQUIRED_COLUMNS = ['id', 'group', 'text'] as const;
const VALID_PORTRAIT_PLACEMENTS = new Set<NarrativePortraitPlacement>(['', 'stage', 'dialogue-left']);
const PLACEHOLDER_PATTERN = /\{\{([A-Za-z0-9_]+)\}\}/g;
const MULTILINE_TEMPLATE_COLUMNS = new Set<NarrativeCsvColumn>(['text', 'sceneHint', 'notes']);
const NARRATIVE_TEMPLATE_COLUMNS = NARRATIVE_CSV_COLUMNS.filter(
  (column): column is NarrativeTemplateColumn => column !== 'portraitPlacement',
);

const parseCsvRecords = (csvText: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        index += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        index += 1;
      }
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim().length > 0)) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((cell) => cell.trim().length > 0)) {
    rows.push(row);
  }

  if (inQuotes) {
    throw new Error('Narrative CSV has an unclosed quoted field.');
  }

  return rows;
};

const normalizeTemplateField = (value: string): string => value.replace(/\\n/g, '\n').trim();

const normalizeNarrativeColumnValue = (column: NarrativeCsvColumn, value: string): string => {
  const trimmed = value.trim();
  return MULTILINE_TEMPLATE_COLUMNS.has(column) ? normalizeTemplateField(trimmed) : trimmed;
};

const buildNarrativeEntryFromRow = (
  row: Record<NarrativeCsvColumn, string>,
  sourceFile: string,
  rowNumber: number,
): NarrativeEntry => {
  const values = Object.fromEntries(
    NARRATIVE_CSV_COLUMNS.map((column) => [column, normalizeNarrativeColumnValue(column, row[column] ?? '')]),
  ) as Record<NarrativeCsvColumn, string>;

  const portraitPlacement = (values.portraitPlacement as NarrativePortraitPlacement) || '';

  if (!values.id) {
    throw new Error(`${sourceFile} row ${rowNumber} has an empty id.`);
  }
  if (!values.group) {
    throw new Error(`${sourceFile} row ${rowNumber} has an empty group.`);
  }
  if (!values.text) {
    throw new Error(`${sourceFile} row ${rowNumber} has an empty text field.`);
  }
  if (!VALID_PORTRAIT_PLACEMENTS.has(portraitPlacement)) {
    throw new Error(`${sourceFile} row ${rowNumber} has invalid portraitPlacement "${portraitPlacement}".`);
  }

  return {
    ...values,
    portraitPlacement,
    sourceFile,
  };
};

export const parseNarrativeCsv = (csvText: string, sourceFile = 'inline.csv'): NarrativeEntry[] => {
  const records = parseCsvRecords(csvText);
  if (records.length === 0) {
    return [];
  }

  const header = records[0].map((cell) => cell.trim());
  REQUIRED_COLUMNS.forEach((column) => {
    if (!header.includes(column)) {
      throw new Error(`${sourceFile} is missing required column "${column}".`);
    }
  });

  const headerSet = new Set(header);
  NARRATIVE_CSV_COLUMNS.forEach((column) => {
    if (!headerSet.has(column)) {
      throw new Error(`${sourceFile} is missing narrative column "${column}".`);
    }
  });

  return records.slice(1).map((record, rowIndex) => {
    const row = {} as Record<NarrativeCsvColumn, string>;
    header.forEach((column, columnIndex) => {
      if (headerSet.has(column as NarrativeCsvColumn)) {
        row[column as NarrativeCsvColumn] = record[columnIndex] ?? '';
      }
    });

    return buildNarrativeEntryFromRow(row, sourceFile, rowIndex + 2);
  });
};

export const loadNarrativeEntries = (sources: Record<string, string>): NarrativeEntry[] => {
  const entries = Object.entries(sources).flatMap(([sourceFile, csvText]) => parseNarrativeCsv(csvText, sourceFile));
  const seenIds = new Set<string>();

  entries.forEach((entry) => {
    if (seenIds.has(entry.id)) {
      throw new Error(`Duplicate narrative id "${entry.id}".`);
    }
    seenIds.add(entry.id);
  });

  return entries;
};

export const renderNarrativeTemplate = (template: string, variables: NarrativeVariables = {}): string =>
  template.replace(PLACEHOLDER_PATTERN, (match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? match : String(value);
  });

export const renderNarrativeEntryTemplate = (
  entry: NarrativeEntry,
  variables: NarrativeVariables = {},
): NarrativeEntry => {
  const renderedFields = Object.fromEntries(
    NARRATIVE_TEMPLATE_COLUMNS.map((column) => [column, renderNarrativeTemplate(entry[column], variables)]),
  ) as Record<NarrativeTemplateColumn, string>;

  return {
    ...entry,
    ...renderedFields,
  };
};

export const findUnresolvedNarrativeVariables = (text: string): string[] => {
  const unresolved = new Set<string>();
  for (const match of text.matchAll(PLACEHOLDER_PATTERN)) {
    unresolved.add(match[1]);
  }
  return [...unresolved];
};
