import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Moon,
  Pill,
  Sunrise,
  Sunset,
  Utensils,
} from "lucide-react";
import {
  getScheduleForDate,
  getTakenRecord,
  toDateKey,
} from "@/shared/lib/schedule";
import type {
  IntakeRecord,
  IntakeTiming,
  Medicine,
  Person,
} from "@/shared/types/domain";
import { timingLabels } from "@/shared/types/domain";

type MedicationCalendarProps = {
  medicines: Medicine[];
  people: Person[];
  records: IntakeRecord[];
  selectedDate: string;
  onSelectDate: (dateKey: string) => void;
  onToggle: (
    medicine: Medicine,
    timing: IntakeTiming,
    taken: boolean,
    dateKey: string,
  ) => void;
};

const timingIcons: Record<IntakeTiming, typeof Sunrise> = {
  wakeup: Sunrise,
  beforeBreakfast: Coffee,
  afterBreakfast: Coffee,
  beforeLunch: Utensils,
  afterLunch: Utensils,
  betweenMeals: Clock3,
  beforeDinner: Sunset,
  afterDinner: Sunset,
  bedtime: Moon,
  asNeeded: Pill,
};

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"];

function buildMonthDays(selectedDate: string) {
  const base = new Date(`${selectedDate}T00:00:00`);
  const first = new Date(base.getFullYear(), base.getMonth(), 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      inMonth: date.getMonth() === base.getMonth(),
    };
  });
}

export function MedicationCalendar({
  medicines,
  onSelectDate,
  onToggle,
  people,
  records,
  selectedDate,
}: MedicationCalendarProps) {
  const selected = new Date(`${selectedDate}T00:00:00`);
  const days = buildMonthDays(selectedDate);
  const selectedSchedule = getScheduleForDate(medicines, selectedDate);

  function moveMonth(offset: number) {
    const next = new Date(
      selected.getFullYear(),
      selected.getMonth() + offset,
      1,
    );
    onSelectDate(toDateKey(next));
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold tracking-normal text-zinc-950 sm:text-3xl">
          {selected.getFullYear()}年 {selected.getMonth() + 1}月
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="cute-pill px-3 py-2 text-sm font-semibold text-pink-700"
            onClick={() => onSelectDate(toDateKey(new Date()))}
            type="button"
          >
            今日
          </button>
          <button
            className="cute-pill p-2.5 text-pink-700"
            onClick={() => moveMonth(-1)}
            type="button"
            aria-label="前の月"
          >
            <ChevronLeft aria-hidden className="h-5 w-5" />
          </button>
          <button
            className="cute-pill p-2.5 text-pink-700"
            onClick={() => moveMonth(1)}
            type="button"
            aria-label="次の月"
          >
            <ChevronRight aria-hidden className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="cute-surface rounded-lg p-4">
        <div className="grid grid-cols-7 text-center text-sm font-semibold text-muted-foreground">
          {weekdayLabels.map((label, index) => (
            <span
              className={
                index === 0 ? "text-red-500" : index === 6 ? "text-primary" : ""
              }
              key={label}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 sm:gap-2">
          {days.map(({ date, dateKey, inMonth }) => {
            const schedule = getScheduleForDate(medicines, dateKey);
            const takenCount = schedule.filter(({ medicine, timing }) =>
              getTakenRecord(records, medicine.id, timing, dateKey),
            ).length;
            const active = dateKey === selectedDate;

            return (
              <button
                className={`motion-press min-h-12 rounded-lg p-1.5 text-center transition-all ${
                  active
                    ? "border-2 border-pink-300 bg-pink-50 text-pink-700"
                    : inMonth
                      ? "bg-white/60 hover:bg-pink-50"
                      : "bg-white/30 text-muted-foreground/35"
                }`}
                key={dateKey}
                onClick={() => onSelectDate(dateKey)}
                type="button"
              >
                <span
                  className={`block text-base font-semibold ${active ? "text-zinc-950" : ""}`}
                >
                  {date.getDate()}
                </span>
                <span className="mt-2 flex justify-center gap-1">
                  {schedule.slice(0, 3).map(({ medicine, timing }) => (
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        getTakenRecord(records, medicine.id, timing, dateKey)
                          ? "bg-emerald-400"
                          : "bg-zinc-300"
                      }`}
                      key={`${medicine.id}:${timing}`}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-zinc-950">
          {selected.toLocaleDateString("ja-JP", {
            weekday: "short",
            month: "long",
            day: "numeric",
          })}
        </h3>
        <div className="cute-surface overflow-hidden rounded-lg">
          {selectedSchedule.map(({ medicine, timing }) => {
            const Icon = timingIcons[timing];
            const isTaken = Boolean(
              getTakenRecord(records, medicine.id, timing, selectedDate),
            );
            const person = people.find(
              (candidate) => candidate.id === medicine.personId,
            );

            return (
              <label
                className="motion-enter flex items-center justify-between gap-4 border-b border-zinc-100 p-5 last:border-b-0"
                key={`${medicine.id}:${timing}`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                    <Icon aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-lg font-semibold text-zinc-950">
                      {timingLabels[timing]}
                    </span>
                    <span className="mt-1 block truncate text-sm text-zinc-400">
                      {medicine.name} / {medicine.dosage} /{" "}
                      {person?.name ?? "未設定"}
                    </span>
                  </span>
                </span>
                <button
                  className={`motion-press flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                    isTaken
                      ? "motion-complete motion-pop bg-emerald-400 text-white shadow-[0_10px_24px_rgba(52,211,153,0.22)]"
                      : "bg-pink-50 text-pink-200"
                  }`}
                  onClick={() =>
                    onToggle(medicine, timing, !isTaken, selectedDate)
                  }
                  type="button"
                >
                  <Check aria-hidden className="h-7 w-7" />
                </button>
              </label>
            );
          })}
        </div>
      </div>
    </section>
  );
}
