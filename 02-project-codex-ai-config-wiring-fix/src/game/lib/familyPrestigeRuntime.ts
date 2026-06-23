import { resolveFamilyInitialTraits } from '../numerics/numericCatalog';

export interface MonthlyFamilyPrestigeDelta {
  fatherOfficeDelta: number;
  familyBackgroundDelta: number;
  total: number;
}

export const resolveMonthlyFamilyPrestigeDelta = (family: string): MonthlyFamilyPrestigeDelta => {
  const matchedTraits = resolveFamilyInitialTraits(family);
  const fatherOfficeDelta = matchedTraits.reduce((sum, trait) => sum + trait.monthlyOfficePrestige, 0);
  const familyBackgroundDelta = matchedTraits.reduce((sum, trait) => sum + trait.monthlyBackgroundPrestige, 0);
  return {
    fatherOfficeDelta,
    familyBackgroundDelta,
    total: fatherOfficeDelta + familyBackgroundDelta,
  };
};
