import { ChevronDown, Pencil, Plus, Tablets, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { Badge } from "@/shared/components/badge";
import { Button } from "@/shared/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { Input } from "@/shared/components/input";
import type { IntakeTiming, Medicine, Person } from "@/shared/types/domain";
import { timingLabels } from "@/shared/types/domain";

type MedicineListProps = {
  people: Person[];
  medicines: Medicine[];
  onAdd: (input: {
    dosage: string;
    endDate?: string;
    instructions: string;
    name: string;
    personId: string;
    prescribedQuantity: number;
    startDate: string;
    timing: IntakeTiming[];
  }) => void;
  onUpdate: (
    medicineId: string,
    input: {
      dosage: string;
      endDate?: string;
      instructions: string;
      name: string;
      personId: string;
      prescribedQuantity: number;
      startDate: string;
      timing: IntakeTiming[];
    },
  ) => void;
};

const usageMethods = [
  "食後に服用",
  "食前に服用",
  "食間に服用",
  "就寝前に服用",
  "症状がある時に服用",
  "医師の指示通りに服用",
];

export function MedicineList({
  onAdd,
  onUpdate,
  people,
  medicines,
}: MedicineListProps) {
  const [isAdding, setIsAdding] = useState(medicines.length === 0);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [name, setName] = useState("");
  const [dosage, setDosage] = useState("");
  const [prescribedQuantity, setPrescribedQuantity] = useState("0");
  const [instructions, setInstructions] = useState(usageMethods[0]);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState("");
  const [timing, setTiming] = useState<IntakeTiming[]>(["afterBreakfast"]);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !personId) {
      return;
    }

    const input = {
      dosage,
      endDate: endDate || undefined,
      instructions,
      name,
      personId,
      prescribedQuantity: Math.max(
        0,
        Number.parseInt(prescribedQuantity, 10) || 0,
      ),
      startDate,
      timing,
    };

    if (editingId) {
      onUpdate(editingId, input);
    } else {
      onAdd(input);
    }
    resetForm();
  }

  function resetForm() {
    setEditingId(undefined);
    setIsAdding(false);
    setName("");
    setDosage("");
    setPrescribedQuantity("0");
    setInstructions(usageMethods[0]);
    setStartDate(new Date().toISOString().slice(0, 10));
    setEndDate("");
    setTiming(["afterBreakfast"]);
    setPersonId(people[0]?.id ?? "");
  }

  function startEdit(medicine: Medicine) {
    setEditingId(medicine.id);
    setIsAdding(true);
    setPersonId(medicine.personId);
    setName(medicine.name);
    setDosage(medicine.dosage);
    setPrescribedQuantity(String(medicine.stock));
    setInstructions(medicine.instructions || usageMethods[0]);
    setStartDate(medicine.startDate);
    setEndDate(medicine.endDate ?? "");
    setTiming(medicine.timing);
  }

  function toggleTiming(value: IntakeTiming) {
    setTiming((current) => {
      if (current.includes(value)) {
        const next = current.filter((candidate) => candidate !== value);
        return next.length === 0 ? current : next;
      }

      return [...current, value];
    });
  }

  return (
    <section className="space-y-7">
      <div className="flex items-center justify-end">
        <Button
          onClick={() => {
            if (isAdding) {
              resetForm();
              return;
            }
            setIsAdding(true);
          }}
          size="sm"
          type="button"
          className="rounded-full"
        >
          <Plus aria-hidden className="h-4 w-4" />
          {isAdding ? "閉じる" : "追加"}
        </Button>
      </div>

      {isAdding && (
        <Card className="motion-sheet">
          <CardHeader>
            <CardTitle>{editingId ? "薬を編集" : "薬を追加"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-2 text-sm font-medium">
                  <span>薬名</span>
                  <Input
                    onChange={(event) => setName(event.target.value)}
                    placeholder="アムロジピン"
                    value={name}
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  <span>用量</span>
                  <Input
                    onChange={(event) => setDosage(event.target.value)}
                    placeholder="5mg / 1錠"
                    value={dosage}
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  <span>処方数量</span>
                  <Input
                    min={0}
                    onChange={(event) =>
                      setPrescribedQuantity(event.target.value)
                    }
                    placeholder="28"
                    type="number"
                    value={prescribedQuantity}
                  />
                </label>
              </div>

              <label className="block space-y-2 text-sm font-medium">
                <span>主に飲む人</span>
                <span className="relative block">
                  <select
                    className="h-10 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => setPersonId(event.target.value)}
                    value={personId}
                  >
                    {people.map((person) => (
                      <option key={person.id} value={person.id}>
                        {person.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </span>
              </label>

              <label className="block space-y-2 text-sm font-medium">
                <span>服用方法</span>
                <span className="relative block">
                  <select
                    className="h-10 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onChange={(event) => setInstructions(event.target.value)}
                    value={instructions}
                  >
                    {usageMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden
                    className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  />
                </span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-2 text-sm font-medium">
                  <span>開始日</span>
                  <Input
                    onChange={(event) => setStartDate(event.target.value)}
                    type="date"
                    value={startDate}
                  />
                </label>
                <label className="block space-y-2 text-sm font-medium">
                  <span>終了日</span>
                  <Input
                    onChange={(event) => setEndDate(event.target.value)}
                    type="date"
                    value={endDate}
                  />
                </label>
              </div>
              <div className="space-y-3">
                <span className="text-sm font-medium">服用タイミング</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {(Object.keys(timingLabels) as IntakeTiming[]).map(
                    (value) => (
                      <label
                        className={`motion-press flex min-h-12 items-center justify-center rounded-full border px-3 text-sm font-semibold ${
                          timing.includes(value)
                            ? "border-pink-300 bg-pink-100 text-pink-700"
                            : "border-pink-100 bg-white/70 text-zinc-500"
                        }`}
                        key={value}
                      >
                        <input
                          checked={timing.includes(value)}
                          className="sr-only"
                          onChange={() => toggleTiming(value)}
                          type="checkbox"
                        />
                        {timingLabels[value]}
                      </label>
                    ),
                  )}
                </div>
              </div>
              <Button className="w-full" type="submit">
                {editingId ? (
                  <Pencil aria-hidden className="h-4 w-4" />
                ) : (
                  <Plus aria-hidden className="h-4 w-4" />
                )}
                {editingId ? "保存" : "追加"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="divide-y divide-zinc-100">
            {medicines.map((medicine) => {
              const person = people.find(
                (candidate) => candidate.id === medicine.personId,
              );
              return (
                <div className="motion-enter bg-white/64 p-5" key={medicine.id}>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
                      <Tablets aria-hidden className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-semibold text-zinc-950">
                        {medicine.name}
                      </h3>
                      <p className="mt-1 text-sm text-zinc-400">
                        {person?.name ?? "未設定"} / {medicine.dosage}
                      </p>
                      <p className="mt-2 text-sm text-zinc-500">
                        {medicine.instructions}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        {medicine.startDate} から {medicine.endDate || "継続"}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {medicine.timing.map((timing) => (
                          <Badge key={timing} tone="rose">
                            {timingLabels[timing]}
                          </Badge>
                        ))}
                        <Badge tone={medicine.stock <= 5 ? "amber" : "neutral"}>
                          処方 {medicine.stock}
                        </Badge>
                      </div>
                    </div>
                    <button
                      aria-label={`${medicine.name}を編集`}
                      className="motion-press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-600"
                      onClick={() =>
                        editingId === medicine.id
                          ? resetForm()
                          : startEdit(medicine)
                      }
                      type="button"
                    >
                      {editingId === medicine.id ? (
                        <X aria-hidden className="h-4 w-4" />
                      ) : (
                        <Pencil aria-hidden className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
