import { FormEvent, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { Input } from "@/shared/components/input";
import type { IntakeRecord, Medicine, Person } from "@/shared/types/domain";

type RecordAddFormProps = {
  people: Person[];
  medicines: Medicine[];
  onAdd: (
    input: Pick<IntakeRecord, "medicineId" | "personId" | "status" | "memo">,
  ) => void;
};

export function RecordAddForm({
  people,
  medicines,
  onAdd,
}: RecordAddFormProps) {
  const [medicineId, setMedicineId] = useState(medicines[0]?.id ?? "");
  const [personId, setPersonId] = useState(people[0]?.id ?? "");
  const [status, setStatus] = useState<IntakeRecord["status"]>("taken");
  const [memo, setMemo] = useState("");

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const medicine = medicines.find((candidate) => candidate.id === medicineId);
    if (!medicine) {
      return;
    }

    onAdd({ medicineId, personId, status, memo });
    setMemo("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>記録追加</CardTitle>
        <CardDescription>
          飲んだ薬や見送った薬をすぐに残せます。
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 md:grid-cols-[1fr_1fr_160px] md:items-end"
          onSubmit={handleSubmit}
        >
          <label className="block space-y-1.5 text-sm font-medium">
            <span>飲む人</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setPersonId(event.target.value)}
              value={personId}
            >
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>薬</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) => setMedicineId(event.target.value)}
              value={medicineId}
            >
              {medicines.map((medicine) => {
                const person = people.find(
                  (candidate) => candidate.id === medicine.personId,
                );
                return (
                  <option key={medicine.id} value={medicine.id}>
                    {person?.name ? `${person.name} / ` : ""}
                    {medicine.name}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium">
            <span>状態</span>
            <select
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onChange={(event) =>
                setStatus(event.target.value as IntakeRecord["status"])
              }
              value={status}
            >
              <option value="taken">飲んだ</option>
              <option value="skipped">見送り</option>
            </select>
          </label>
          <label className="block space-y-1.5 text-sm font-medium md:col-span-3">
            <span>メモ</span>
            <Input
              onChange={(event) => setMemo(event.target.value)}
              placeholder="例: 食後に服用"
              value={memo}
            />
          </label>
          <Button className="md:col-span-3" type="submit">
            <Plus aria-hidden className="h-4 w-4" />
            記録する
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
