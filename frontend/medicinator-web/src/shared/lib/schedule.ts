import type { IntakeRecord, IntakeTiming, Medicine } from "@/shared/types/domain";

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function isMedicineActiveOn(medicine: Medicine, dateKey: string) {
  return medicine.startDate <= dateKey && (!medicine.endDate || medicine.endDate >= dateKey);
}

export function recordKey(medicineId: string, timing: IntakeTiming, dateKey: string) {
  return `${medicineId}:${timing}:${dateKey}`;
}

export function getTakenRecord(records: IntakeRecord[], medicineId: string, timing: IntakeTiming, dateKey: string) {
  return records.find(
    (record) =>
      record.medicineId === medicineId &&
      record.timing === timing &&
      record.takenAt.startsWith(dateKey) &&
      record.status === "taken",
  );
}

export function getScheduleForDate(medicines: Medicine[], dateKey: string) {
  return medicines
    .filter((medicine) => isMedicineActiveOn(medicine, dateKey))
    .flatMap((medicine) => medicine.timing.map((timing) => ({ medicine, timing })));
}
