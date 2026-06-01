export interface MonthlyFamilyPrestigeDelta {
  fatherOfficeDelta: number;
  familyBackgroundDelta: number;
  total: number;
}

const normalizeFamily = (family: string): string => String(family ?? '').replace(/\s+/g, '');

export const resolveMonthlyFamilyPrestigeDelta = (family: string): MonthlyFamilyPrestigeDelta => {
  const normalized = normalizeFamily(family);

  if (normalized.includes('罪臣')) {
    return { fatherOfficeDelta: 0, familyBackgroundDelta: -5, total: -5 };
  }

  if (normalized.includes('商贾')) {
    return { fatherOfficeDelta: 0, familyBackgroundDelta: -3, total: -3 };
  }

  if (normalized.includes('和亲公主')) {
    return { fatherOfficeDelta: 0, familyBackgroundDelta: 1, total: 1 };
  }

  if (normalized.includes('镇国公') || normalized.includes('国公')) {
    return { fatherOfficeDelta: 10, familyBackgroundDelta: 3, total: 13 };
  }

  if (normalized.includes('一品')) {
    return { fatherOfficeDelta: 8, familyBackgroundDelta: 2, total: 10 };
  }

  if (normalized.includes('二品') || normalized.includes('三品')) {
    return { fatherOfficeDelta: 6, familyBackgroundDelta: 2, total: 8 };
  }

  if (normalized.includes('四品')) {
    return { fatherOfficeDelta: 4, familyBackgroundDelta: 1, total: 5 };
  }

  if (normalized.includes('六品')) {
    return { fatherOfficeDelta: 2, familyBackgroundDelta: 0, total: 2 };
  }

  return { fatherOfficeDelta: 0, familyBackgroundDelta: 0, total: 0 };
};
