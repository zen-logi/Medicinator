import { useState } from "react";
import { Check, ChevronDown, Clock3, Coffee, Moon, Pill, Sunrise, Sunset, Utensils } from "lucide-react";
import { getScheduleForDate, getTakenRecord, toDateKey } from "@/shared/lib/schedule";
import type { IntakeRecord, IntakeTiming, Medicine, Person } from "@/shared/types/domain";
import { timingLabels } from "@/shared/types/domain";

type TodayScheduleProps = {
  medicines: Medicine[];
  people: Person[];
  records: IntakeRecord[];
  onToggle: (medicine: Medicine, timing: IntakeTiming, taken: boolean, dateKey: string) => void;
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

const timingOrder: IntakeTiming[] = [
  "wakeup",
  "beforeBreakfast",
  "afterBreakfast",
  "beforeLunch",
  "afterLunch",
  "betweenMeals",
  "beforeDinner",
  "afterDinner",
  "bedtime",
  "asNeeded",
];

export function TodaySchedule({ medicines, onToggle, people, records }: TodayScheduleProps) {
  const [expandedTimings, setExpandedTimings] = useState<Partial<Record<IntakeTiming, boolean>>>({});
  const todayKey = toDateKey(new Date());
  const schedule = getScheduleForDate(medicines, todayKey);
  const grouped = timingOrder.map((timing) => ({
    timing,
    items: schedule.filter((item) => item.timing === timing),
  }));

  return (
    <section className="space-y-7">
      {schedule.length === 0 && (
        <div className="cute-surface grid min-h-64 place-items-center rounded-lg">
          <div className="text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-pink-50 text-pink-500">
              <Check aria-hidden className="h-7 w-7" />
            </span>
            <p className="mt-4 font-semibold text-pink-900">今日の予定はありません</p>
          </div>
        </div>
      )}

      <div className="space-y-5">
        {grouped.map(({ items, timing }) => {
          const Icon = timingIcons[timing];
          if (items.length === 0) {
            return null;
          }

          const takenCount = items.filter(({ medicine }) => getTakenRecord(records, medicine.id, timing, todayKey)).length;
          const completed = takenCount === items.length;
          const expanded = Boolean(expandedTimings[timing]);

          return (
            <div
              className="cute-surface motion-enter rounded-lg p-5"
              key={timing}
              style={{ animationDelay: `${Math.min(timingOrder.indexOf(timing) * 45, 240)}ms` }}
            >
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 sm:gap-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-pink-500">
                      <Icon aria-hidden className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-2xl font-semibold text-pink-950">{timingLabels[timing]}</div>
                      <div className="mt-1 text-sm font-medium text-pink-300">{takenCount}/{items.length}</div>
                    </div>
                  </div>
                </div>

                <button
                  aria-expanded={expanded}
                  aria-label={`${timingLabels[timing]}の薬を${expanded ? "閉じる" : "開く"}`}
                  className="motion-press flex h-11 w-11 items-center justify-center rounded-full bg-white/70 text-pink-400 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85)] hover:text-pink-600"
                  onClick={() => setExpandedTimings((current) => ({ ...current, [timing]: !current[timing] }))}
                  type="button"
                >
                  <ChevronDown
                    aria-hidden
                    className={`h-5 w-5 transition-transform duration-300 ease-out ${expanded ? "rotate-180" : ""}`}
                  />
                </button>

                <button
                  aria-label={`${timingLabels[timing]}をまとめて服用済みにする`}
                  className={`motion-press flex h-14 w-14 items-center justify-center rounded-full transition-colors ${
                    completed
                      ? "motion-complete motion-pop bg-emerald-400 text-white shadow-[0_10px_24px_rgba(52,211,153,0.22)]"
                      : "bg-pink-50 text-pink-200"
                  }`}
                  onClick={() => {
                    for (const { medicine } of items) {
                      const isTaken = Boolean(getTakenRecord(records, medicine.id, timing, todayKey));
                      if (!isTaken) {
                        onToggle(medicine, timing, true, todayKey);
                      }
                    }
                  }}
                  type="button"
                >
                  <Check aria-hidden className="h-7 w-7" />
                </button>
              </div>

              <div className={`motion-collapse-grid ${expanded ? "is-open" : ""}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="motion-collapse-panel mt-5 divide-y divide-zinc-100 border-t border-zinc-100 pt-2">
                    {items.map(({ medicine }) => {
                      const person = people.find((candidate) => candidate.id === medicine.personId);
                      const isTaken = Boolean(getTakenRecord(records, medicine.id, timing, todayKey));

                      return (
                        <label
                          className="flex items-center justify-between gap-4 py-4 text-sm"
                          key={`${medicine.id}:${timing}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-base font-semibold text-zinc-950">{medicine.name}</span>
                            <span className="mt-1 block truncate text-sm text-zinc-400">
                              {medicine.dosage} / {person?.name ?? "未設定"}
                            </span>
                          </span>
                          <input
                            checked={isTaken}
                            className="h-7 w-7 rounded border-pink-200 text-emerald-500 accent-emerald-400"
                            onChange={(event) => onToggle(medicine, timing, event.target.checked, todayKey)}
                            type="checkbox"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
