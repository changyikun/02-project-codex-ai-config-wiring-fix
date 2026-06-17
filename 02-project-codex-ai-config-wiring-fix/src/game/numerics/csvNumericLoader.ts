export type NumericCsvRow = Record<string, string>;

export const parseNumericCsvRecords = (csvText: string): string[][] => {
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
    throw new Error('Numeric CSV has an unclosed quoted field.');
  }

  return rows;
};

export const parseNumericCsv = (
  csvText: string,
  sourceFile = 'inline.csv',
  requiredColumns: readonly string[] = [],
): NumericCsvRow[] => {
  const records = parseNumericCsvRecords(csvText);
  if (records.length === 0) {
    return [];
  }

  const header = records[0].map((cell) => cell.trim());
  requiredColumns.forEach((column) => {
    if (!header.includes(column)) {
      throw new Error(`${sourceFile} is missing required column "${column}".`);
    }
  });

  return records.slice(1).map((record) =>
    Object.fromEntries(header.map((column, columnIndex) => [column, (record[columnIndex] ?? '').trim()])),
  );
};

export const parseRequiredNumber = (value: string, fieldName: string): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Numeric CSV field "${fieldName}" must be a finite number. Received "${value}".`);
  }
  return parsed;
};

export const parseOptionalNumber = (value: string, fieldName: string): number | undefined => {
  if (!value) {
    return undefined;
  }
  return parseRequiredNumber(value, fieldName);
};

export const parseBoolean = (value: string, fieldName: string): boolean => {
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  throw new Error(`Numeric CSV field "${fieldName}" must be true or false. Received "${value}".`);
};

export const parseOptionalBoolean = (value: string, fieldName: string): boolean | undefined =>
  value ? parseBoolean(value, fieldName) : undefined;

export const splitPipeList = (value: string): string[] =>
  value
    .split('|')
    .map((entry) => entry.trim())
    .filter(Boolean);

export const parseStatDeltas = (value: string): Record<string, number> | undefined => {
  if (!value) {
    return undefined;
  }

  const deltas = Object.fromEntries(
    splitPipeList(value).map((entry) => {
      const [key, rawDelta] = entry.split(':');
      if (!key || rawDelta === undefined) {
        throw new Error(`Invalid statDeltas entry "${entry}". Expected key:number.`);
      }
      return [key, parseRequiredNumber(rawDelta, `statDeltas.${key}`)];
    }),
  );

  return Object.keys(deltas).length > 0 ? deltas : undefined;
};
