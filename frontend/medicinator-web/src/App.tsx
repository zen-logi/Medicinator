import { useEffect, useState } from "react";
import { CalendarCheck, CalendarDays, HeartPulse, LogOut, Pill, Settings } from "lucide-react";
import { LoginPanel } from "@/features/auth/LoginPanel";
import { useAuth } from "@/features/auth/AuthProvider";
import { MedicationCalendar } from "@/features/calendar/MedicationCalendar";
import { TodaySchedule } from "@/features/intake-records/TodaySchedule";
import { MedicineList } from "@/features/medicines/MedicineList";
import { SettingsPanel } from "@/features/settings/SettingsPanel";
import { isFirebaseConfigured } from "@/shared/api/firebase";
import { Button } from "@/shared/components/button";
import { toDateKey } from "@/shared/lib/schedule";
import type { FamilyInvite, FamilySettings, IntakeRecord, IntakeTiming, Medicine, Person } from "@/shared/types/domain";

type TabKey = "today" | "calendar" | "medicines" | "settings";

const initialPeople: Person[] = [
  { id: "p1", name: "春子", relation: "本人", color: "#5b8f7b" },
  { id: "p2", name: "健", relation: "家族", color: "#d07a60" },
  { id: "p3", name: "みお", relation: "子ども", color: "#6f86b7" },
];

const initialMedicines: Medicine[] = [
  {
    id: "m1",
    personId: "p1",
    name: "アムロジピン",
    dosage: "5mg / 1錠",
    instructions: "食後に服用",
    startDate: "2026-05-01",
    timing: ["afterBreakfast"],
    stock: 18,
  },
  {
    id: "m2",
    personId: "p1",
    name: "メトホルミン",
    dosage: "250mg / 1錠",
    instructions: "食後に服用",
    startDate: "2026-05-01",
    timing: ["afterBreakfast", "afterDinner"],
    stock: 9,
  },
  {
    id: "m3",
    personId: "p2",
    name: "花粉症の薬",
    dosage: "1包",
    instructions: "就寝前に服用",
    startDate: "2026-05-10",
    endDate: "2026-05-31",
    timing: ["bedtime"],
    stock: 4,
  },
];

const initialFamilySettings: FamilySettings = {
  familyName: "山田家",
  timezone: "Asia/Tokyo",
  reminderEnabled: true,
  reminderLeadMinutes: 10,
};

const tabs: { key: TabKey; label: string; icon: typeof CalendarCheck }[] = [
  { key: "today", label: "本日", icon: CalendarCheck },
  { key: "calendar", label: "カレンダー", icon: CalendarDays },
  { key: "medicines", label: "薬", icon: Pill },
  { key: "settings", label: "設定", icon: Settings },
];

type ApiFamily = {
  id: string;
  name: string;
  role: number;
};

type ApiFamilyInvite = FamilyInvite;

type CreatedFamilyInvite = {
  id: string;
  inviteCode: string;
  expiresAt: string;
};

type ApiPerson = {
  id: string;
  familyId: string;
  name: string;
  note?: string;
};

type ApiMedicine = {
  id: string;
  familyId: string;
  personId: string;
  name: string;
  dosageLabel?: string;
  usage?: string;
  startsOn?: string;
  endsOn?: string;
  timingNames?: IntakeTiming[];
};

type FamilyBootstrap = {
  family: ApiFamily;
  invites: ApiFamilyInvite[];
  medicines: ApiMedicine[];
  people: ApiPerson[];
};

const familyBootstrapPromises = new Map<string, Promise<FamilyBootstrap>>();

export function App() {
  const { apiClient, loading, logout, user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabKey>("today");
  const [people, setPeople] = useState(initialPeople);
  const [medicines, setMedicines] = useState(initialMedicines);
  const [familyInvites, setFamilyInvites] = useState<FamilyInvite[]>([]);
  const [latestInviteCode, setLatestInviteCode] = useState<string | undefined>();
  const [records, setRecords] = useState<IntakeRecord[]>([]);
  const [settings, setSettings] = useState(initialFamilySettings);
  const [, setSyncState] = useState<"idle" | "saving" | "offline">("idle");
  const [familyId, setFamilyId] = useState<string | undefined>();
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const todayLabel = new Intl.DateTimeFormat("ja-JP", {
    day: "numeric",
    month: "long",
    weekday: "short",
  }).format(new Date());
  const activeTabLabel = tabs.find((tab) => tab.key === activeTab)?.label ?? "本日";

  useEffect(() => {
    if (isFirebaseConfigured && !user) {
      return;
    }

    let disposed = false;

    async function ensureFamily() {
      try {
        const bootstrapKey = user?.uid ?? "local-development-user";
        const bootstrap = familyBootstrapPromises.get(bootstrapKey) ?? bootstrapFamily(bootstrapKey);
        familyBootstrapPromises.set(bootstrapKey, bootstrap);
        const { family, invites: apiInvites, medicines: apiMedicines, people: apiPeople } = await bootstrap;
        familyBootstrapPromises.delete(bootstrapKey);

        if (!disposed) {
          setFamilyId(family.id);
          setFamilyInvites(apiInvites);
          setSettings((current) => ({ ...current, familyName: family.name }));
          setPeople(
            apiPeople.map((person, index) => ({
              id: person.id,
              name: person.name,
              relation: person.note ?? "家族",
              color: ["#5b8f7b", "#d07a60", "#6f86b7", "#9777a8"][index % 4],
            })),
          );
          setMedicines(
            apiMedicines.map((medicine) => ({
              id: medicine.id,
              personId: medicine.personId,
              name: medicine.name,
              dosage: medicine.dosageLabel ?? "適量",
              instructions: medicine.usage ?? "",
              startDate: medicine.startsOn ?? toDateKey(new Date()),
              endDate: medicine.endsOn,
              timing: medicine.timingNames ?? ["afterBreakfast"],
              stock: 0,
            })),
          );
          setSyncState("idle");
        }
      } catch {
        familyBootstrapPromises.delete(user?.uid ?? "local-development-user");
        if (!disposed) {
          setSyncState("offline");
        }
      }
    }

    async function bootstrapFamily(bootstrapKey: string) {
      const families = await apiClient.get<ApiFamily[]>("/api/families");
      const family = families[0] ?? await apiClient.post<{ name: string; displayName: string }, ApiFamily>("/api/families", {
        displayName: user?.displayName ?? bootstrapKey,
        name: initialFamilySettings.familyName,
      });
      const [apiPeople, apiMedicines] = await Promise.all([
        apiClient.get<ApiPerson[]>(`/api/families/${family.id}/people`),
        apiClient.get<ApiMedicine[]>(`/api/families/${family.id}/medicines`),
      ]);
      const invites = await apiClient.get<ApiFamilyInvite[]>(`/api/families/${family.id}/invites`).catch(() => []);

      return { family, invites, medicines: apiMedicines, people: apiPeople };
    }

    void ensureFamily();

    return () => {
      disposed = true;
    };
  }, [apiClient, user]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-background text-foreground">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <HeartPulse aria-hidden className="h-5 w-5 animate-pulse text-primary" />
          読み込み中
        </div>
      </main>
    );
  }

  if (isFirebaseConfigured && !user) {
    return <LoginPanel />;
  }

  async function addRecord(input: Pick<IntakeRecord, "medicineId" | "personId" | "status" | "timing" | "memo">, dateKey: string) {
    const record: IntakeRecord = {
      id: crypto.randomUUID(),
      takenAt: toLocalOffsetDateTime(dateKey),
      ...input,
    };

    setRecords((current) => [record, ...current]);
    setSyncState("saving");
    try {
      if (!familyId) {
        throw new Error("Family is not ready.");
      }

      const response = await apiClient.post<
        { medicineId: string; timingName: IntakeTiming; note?: string; personId: string; takenAt: string },
        { id: string }
      >(`/api/families/${familyId}/intakes`, {
        medicineId: record.medicineId,
        timingName: record.timing,
        note: record.memo,
        personId: record.personId,
        takenAt: record.takenAt,
      });
      setRecords((current) => current.map((candidate) => (candidate.id === record.id ? { ...candidate, id: response.id } : candidate)));
      setSyncState("idle");
    } catch {
      setSyncState("offline");
    }
  }

  function toggleMedicine(medicine: Medicine, timing: IntakeTiming, taken: boolean, dateKey: string) {
    setRecords((current) =>
      current.filter(
        (record) => !(record.medicineId === medicine.id && record.timing === timing && record.takenAt.startsWith(dateKey)),
      ),
    );

    if (taken) {
      void addRecord({ medicineId: medicine.id, personId: medicine.personId, status: "taken", timing }, dateKey);
      return;
    }

    if (familyId) {
      setSyncState("saving");
      const query = new URLSearchParams({
        day: dateKey,
        medicineId: medicine.id,
        personId: medicine.personId,
        timingName: timing,
      });
      void apiClient
        .delete(`/api/families/${familyId}/intakes?${query.toString()}`)
        .then(() => setSyncState("idle"))
        .catch(() => setSyncState("offline"));
    }
  }

  async function addPerson(name: string, relation: string) {
    setSyncState("saving");
    try {
      if (!familyId) {
        throw new Error("Family is not ready.");
      }

      const response = await apiClient.post<{ name: string; note: string }, ApiPerson>(
        `/api/families/${familyId}/people`,
        { name: name.trim(), note: relation.trim() || "家族" },
      );
      const person: Person = {
        id: response.id,
        name: response.name,
        relation: response.note ?? "家族",
        color: ["#5b8f7b", "#d07a60", "#6f86b7", "#9777a8"][people.length % 4],
      };

      setPeople((current) => [...current, person]);
      setSyncState("idle");
    } catch {
      const person: Person = {
        id: crypto.randomUUID(),
        name: name.trim(),
        relation: relation.trim() || "家族",
        color: ["#5b8f7b", "#d07a60", "#6f86b7", "#9777a8"][people.length % 4],
      };

      setPeople((current) => [...current, person]);
      setSyncState("offline");
    }
  }

  async function updatePerson(personId: string, name: string, relation: string) {
    const previousPeople = people;
    setPeople((current) =>
      current.map((person) =>
        person.id === personId ? { ...person, name: name.trim(), relation: relation.trim() || "家族" } : person,
      ),
    );
    setSyncState("saving");
    try {
      if (!familyId) {
        throw new Error("Family is not ready.");
      }

      const response = await apiClient.put<{ name: string; note: string }, ApiPerson>(
        `/api/families/${familyId}/people/${personId}`,
        { name: name.trim(), note: relation.trim() || "家族" },
      );
      setPeople((current) =>
        current.map((person) =>
          person.id === personId ? { ...person, name: response.name, relation: response.note ?? "家族" } : person,
        ),
      );
      setSyncState("idle");
    } catch {
      setPeople(previousPeople);
      setSyncState("offline");
    }
  }

  async function deletePerson(personId: string) {
    const previousPeople = people;
    setSyncState("saving");
    try {
      if (!familyId) {
        throw new Error("Family is not ready.");
      }

      await apiClient.delete(`/api/families/${familyId}/people/${personId}`);
      setPeople((current) => current.filter((person) => person.id !== personId));
      setSyncState("idle");
    } catch {
      setPeople(previousPeople);
      setSyncState("offline");
    }
  }

  async function addMedicine(input: {
    dosage: string;
    endDate?: string;
    instructions: string;
    name: string;
    personId: string;
    startDate: string;
    timing: IntakeTiming[];
  }) {
    setSyncState("saving");
    try {
      if (!familyId) {
        throw new Error("Family is not ready.");
      }

      const response = await apiClient.post<
        {
          personId: string;
          dosageLabel: string;
          endsOn?: string;
          usage: string;
          name: string;
          startsOn: string;
          timingNames: IntakeTiming[];
        },
        ApiMedicine
      >(
        `/api/families/${familyId}/medicines`,
        {
          dosageLabel: input.dosage.trim() || "適量",
          endsOn: input.endDate,
          usage: input.instructions.trim(),
          name: input.name.trim(),
          personId: input.personId,
          startsOn: input.startDate,
          timingNames: input.timing,
        },
      );
      const medicine: Medicine = {
        id: response.id,
        personId: input.personId,
        name: response.name,
        dosage: response.dosageLabel ?? "適量",
        instructions: response.usage ?? input.instructions,
        startDate: response.startsOn ?? input.startDate,
        endDate: response.endsOn ?? input.endDate,
        timing: response.timingNames ?? input.timing,
        stock: 0,
      };

      setMedicines((current) => [...current, medicine]);
      setSyncState("idle");
    } catch {
      const medicine: Medicine = {
        id: crypto.randomUUID(),
        personId: input.personId,
        name: input.name.trim(),
        dosage: input.dosage.trim() || "適量",
        instructions: input.instructions.trim(),
        startDate: input.startDate,
        endDate: input.endDate,
        timing: input.timing,
        stock: 0,
      };

      setMedicines((current) => [...current, medicine]);
      setSyncState("offline");
    }
  }

  async function createFamilyInvite() {
    if (!familyId) {
      return;
    }

    setSyncState("saving");
    try {
      const created = await apiClient.post<Record<string, never>, CreatedFamilyInvite>(
        `/api/families/${familyId}/invites`,
        {},
      );
      setLatestInviteCode(created.inviteCode);
      const invites = await apiClient.get<ApiFamilyInvite[]>(`/api/families/${familyId}/invites`);
      setFamilyInvites(invites);
      setSyncState("idle");
    } catch {
      setSyncState("offline");
    }
  }

  async function revokeFamilyInvite(inviteId: string) {
    if (!familyId) {
      return;
    }

    setSyncState("saving");
    try {
      await apiClient.delete(`/api/families/${familyId}/invites/${inviteId}`);
      setFamilyInvites((current) => current.map((invite) => (invite.id === inviteId ? { ...invite, revokedAt: new Date().toISOString() } : invite)));
      setSyncState("idle");
    } catch {
      setSyncState("offline");
    }
  }

  async function joinFamilyInvite(inviteCode: string) {
    const bootstrapKey = user?.uid ?? "local-development-user";
    setSyncState("saving");
    try {
      const family = await apiClient.post<{ displayName: string; inviteCode: string }, ApiFamily>(
        "/api/families/join",
        { displayName: user?.displayName ?? bootstrapKey, inviteCode },
      );
      const [apiPeople, apiMedicines, apiInvites] = await Promise.all([
        apiClient.get<ApiPerson[]>(`/api/families/${family.id}/people`),
        apiClient.get<ApiMedicine[]>(`/api/families/${family.id}/medicines`),
        apiClient.get<ApiFamilyInvite[]>(`/api/families/${family.id}/invites`).catch(() => []),
      ]);

      setFamilyId(family.id);
      setFamilyInvites(apiInvites);
      setLatestInviteCode(undefined);
      setSettings((current) => ({ ...current, familyName: family.name }));
      setPeople(
        apiPeople.map((person, index) => ({
          id: person.id,
          name: person.name,
          relation: person.note ?? "家族",
          color: ["#5b8f7b", "#d07a60", "#6f86b7", "#9777a8"][index % 4],
        })),
      );
      setMedicines(
        apiMedicines.map((medicine) => ({
          id: medicine.id,
          personId: medicine.personId,
          name: medicine.name,
          dosage: medicine.dosageLabel ?? "適量",
          instructions: medicine.usage ?? "",
          startDate: medicine.startsOn ?? toDateKey(new Date()),
          endDate: medicine.endsOn,
          timing: medicine.timingNames ?? ["afterBreakfast"],
          stock: 0,
        })),
      );
      setSyncState("idle");
    } catch {
      setSyncState("offline");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-8 px-5 pb-28 pt-6 sm:px-8 lg:px-10">
        <header className="space-y-7 pb-2">
          <div className="flex items-center justify-between gap-3">
            <div className="inline-flex min-w-0 items-center gap-2 rounded-full border border-white/80 bg-emerald-50/90 px-3.5 py-2 text-sm shadow-[0_8px_22px_rgba(116,190,176,0.16)]">
              <HeartPulse aria-hidden className="h-4 w-4 shrink-0 text-emerald-600" />
              <span className="truncate font-semibold text-emerald-950">{settings.familyName}</span>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <Button onClick={() => void logout()} size="icon" type="button" variant="ghost" aria-label="ログアウト">
                  <LogOut aria-hidden className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-400">{todayLabel}</p>
              <h1 className="mt-2 truncate text-4xl font-semibold tracking-normal text-zinc-950 sm:text-5xl">
                {activeTabLabel}
              </h1>
            </div>
          </div>
        </header>

        <div className="flex-1">
          {activeTab === "today" && (
            <TodaySchedule medicines={medicines} onToggle={toggleMedicine} people={people} records={records} />
          )}
          {activeTab === "calendar" && (
            <MedicationCalendar
              medicines={medicines}
              onSelectDate={setSelectedDate}
              onToggle={toggleMedicine}
              people={people}
              records={records}
              selectedDate={selectedDate}
            />
          )}
          {activeTab === "medicines" && <MedicineList medicines={medicines} onAdd={addMedicine} people={people} />}
          {activeTab === "settings" && (
            <SettingsPanel
              familyInvites={familyInvites}
              latestInviteCode={latestInviteCode}
              medicines={medicines}
              onAddPerson={addPerson}
              onChangeSettings={setSettings}
              onCreateInvite={createFamilyInvite}
              onDeletePerson={deletePerson}
              onJoinInvite={joinFamilyInvite}
              onRevokeInvite={revokeFamilyInvite}
              onUpdatePerson={updatePerson}
              people={people}
              records={records}
              settings={settings}
            />
          )}
        </div>

        <nav
          className="fixed inset-x-4 bottom-4 z-10 mx-auto grid max-w-3xl grid-cols-4 gap-2 rounded-lg border border-white/80 bg-white/86 p-2.5 shadow-[0_18px_44px_rgba(234,115,149,0.18)] backdrop-blur"
          aria-label="主要操作"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                aria-current={active ? "page" : undefined}
                className={`motion-press flex h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-semibold transition-colors sm:text-sm ${
                  active
                    ? "motion-pop bg-pink-100 text-pink-700 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.85)]"
                    : "text-zinc-500 hover:bg-pink-50 hover:text-pink-700"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <Icon aria-hidden className={`h-4 w-4 ${active ? "motion-pop" : ""}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </main>
  );
}

function toLocalOffsetDateTime(dateKey: string) {
  const now = new Date();
  const localDate = toDateKey(now);
  const time = localDate === dateKey ? now.toTimeString().slice(0, 8) : "12:00:00";
  const offsetMinutes = -now.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteMinutes = Math.abs(offsetMinutes);
  const hours = `${Math.floor(absoluteMinutes / 60)}`.padStart(2, "0");
  const minutes = `${absoluteMinutes % 60}`.padStart(2, "0");
  return `${dateKey}T${time}${sign}${hours}:${minutes}`;
}
