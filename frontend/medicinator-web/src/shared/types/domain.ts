export type IntakeTiming =
  | "wakeup"
  | "beforeBreakfast"
  | "afterBreakfast"
  | "beforeLunch"
  | "afterLunch"
  | "betweenMeals"
  | "beforeDinner"
  | "afterDinner"
  | "bedtime"
  | "asNeeded";

export type Person = {
  id: string;
  name: string;
  relation: string;
  color: string;
};

export type Medicine = {
  id: string;
  personId: string;
  name: string;
  dosage: string;
  instructions: string;
  startDate: string;
  endDate?: string;
  timing: IntakeTiming[];
  stock: number;
  note?: string;
};

export type IntakeRecord = {
  id: string;
  personId: string;
  medicineId: string;
  takenAt: string;
  timing: IntakeTiming;
  status: "taken" | "skipped";
  memo?: string;
};

export type FamilySettings = {
  familyName: string;
  timezone: string;
  reminderEnabled: boolean;
  reminderLeadMinutes: number;
};

export type FamilyInvite = {
  id: string;
  familyId: string;
  createdByFirebaseUid: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
  revokedAt?: string;
};

export const timingLabels: Record<IntakeTiming, string> = {
  wakeup: "起床時",
  beforeBreakfast: "朝食前",
  afterBreakfast: "朝食後",
  beforeLunch: "昼食前",
  afterLunch: "昼食後",
  betweenMeals: "食間",
  beforeDinner: "夕食前",
  afterDinner: "夕食後",
  bedtime: "寝る前",
  asNeeded: "必要時",
};

export const timingShortLabels: Record<IntakeTiming, string> = {
  wakeup: "起床",
  beforeBreakfast: "朝前",
  afterBreakfast: "朝後",
  beforeLunch: "昼前",
  afterLunch: "昼後",
  betweenMeals: "食間",
  beforeDinner: "夕前",
  afterDinner: "夕後",
  bedtime: "Bed",
  asNeeded: "必要",
};
