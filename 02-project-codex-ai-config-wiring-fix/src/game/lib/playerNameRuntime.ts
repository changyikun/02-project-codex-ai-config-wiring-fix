export const resolvePlayerDisplayName = (name: string | undefined, fallback = '小主'): string => {
  const normalized = name?.trim();
  return normalized ? normalized : fallback;
};

export const resolvePlayerSurname = (name: string | undefined, fallback = '沈'): string => {
  const normalized = name?.trim();
  const [firstCharacter] = normalized ? Array.from(normalized) : [];
  return firstCharacter ?? fallback;
};

export const resolvePlayerClanLabel = (name: string | undefined, fallbackSurname = '沈'): string =>
  `${resolvePlayerSurname(name, fallbackSurname)}氏`;
