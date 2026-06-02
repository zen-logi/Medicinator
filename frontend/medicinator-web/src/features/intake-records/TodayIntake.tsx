import { Check, Clock, RotateCcw } from "lucide-react";
import { Badge } from "@/shared/components/badge";
import { Button } from "@/shared/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/card";
import type { IntakeRecord, Medicine, Person } from "@/shared/types/domain";
import { timingLabels } from "@/shared/types/domain";

type TodayIntakeProps = {
  people: Person[];
  medicines: Medicine[];
  records: IntakeRecord[];
  onRecord: (medicineId: string, status: IntakeRecord["status"]) => void;
};

export function TodayIntake({ people, medicines, records, onRecord }: TodayIntakeProps) {
  const takenMedicineIds = new Set(records.filter((record) => record.status === "taken").map((record) => record.medicineId));

  return (
    <Card>
      <CardHeader>
        <CardTitle>今日の服薬</CardTitle>
        <CardDescription>今日飲む予定の薬と記録状況です。</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {medicines.map((medicine) => {
            const person = people.find((candidate) => candidate.id === medicine.personId);
            const isTaken = takenMedicineIds.has(medicine.id);

            return (
              <div
                className="grid gap-3 rounded-lg border border-border bg-white/72 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={medicine.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{medicine.name}</span>
                    <Badge tone={isTaken ? "mint" : "amber"}>{isTaken ? "記録済み" : "未記録"}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    <span>{person?.name ?? "未設定"}</span>
                    <span>{medicine.dosage}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock aria-hidden className="h-3.5 w-3.5" />
                      {medicine.timing.map((timing) => timingLabels[timing]).join(" / ")}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => onRecord(medicine.id, "taken")} size="sm" type="button">
                    <Check aria-hidden className="h-4 w-4" />
                    飲んだ
                  </Button>
                  <Button onClick={() => onRecord(medicine.id, "skipped")} size="sm" type="button" variant="outline">
                    <RotateCcw aria-hidden className="h-4 w-4" />
                    見送り
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
