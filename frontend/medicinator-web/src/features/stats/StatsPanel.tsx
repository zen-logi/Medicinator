import { BarChart3, CheckCircle2, ClipboardList } from "lucide-react";
import {
  getScheduleForDate,
  getTakenRecord,
  toDateKey,
} from "@/shared/lib/schedule";
import type { IntakeRecord, Medicine } from "@/shared/types/domain";

export function StatsPanel({
  medicines,
  records,
}: {
  medicines: Medicine[];
  records: IntakeRecord[];
}) {
  const todayKey = toDateKey(new Date());
  const schedule = getScheduleForDate(medicines, todayKey);
  const taken = schedule.filter(({ medicine, timing }) =>
    getTakenRecord(records, medicine.id, timing, todayKey),
  ).length;
  const rate =
    schedule.length === 0 ? 0 : Math.round((taken / schedule.length) * 100);

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-base font-semibold tracking-normal">統計</h2>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow-[0_14px_36px_rgba(24,24,27,0.06)] ring-1 ring-black/5">
          <CheckCircle2 aria-hidden className="h-8 w-8 text-emerald-500" />
          <p className="mt-4 text-sm text-muted-foreground">本日の服用率</p>
          <p className="mt-1 text-4xl font-bold">{rate}%</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-[0_14px_36px_rgba(24,24,27,0.06)] ring-1 ring-black/5">
          <ClipboardList aria-hidden className="h-8 w-8 text-primary" />
          <p className="mt-4 text-sm text-muted-foreground">本日の予定</p>
          <p className="mt-1 text-4xl font-bold">{schedule.length}</p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-[0_14px_36px_rgba(24,24,27,0.06)] ring-1 ring-black/5">
          <BarChart3 aria-hidden className="h-8 w-8 text-indigo-500" />
          <p className="mt-4 text-sm text-muted-foreground">総記録数</p>
          <p className="mt-1 text-4xl font-bold">{records.length}</p>
        </div>
      </div>
    </section>
  );
}
