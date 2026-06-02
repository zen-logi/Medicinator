import { FamilySettingsPanel } from "@/features/family/FamilySettingsPanel";
import { PeopleList } from "@/features/people/PeopleList";
import { StatsPanel } from "@/features/stats/StatsPanel";
import type {
  FamilyInvite,
  FamilySettings,
  IntakeRecord,
  Medicine,
  Person,
} from "@/shared/types/domain";

type SettingsPanelProps = {
  settings: FamilySettings;
  familyInvites: FamilyInvite[];
  latestInviteCode?: string;
  medicines: Medicine[];
  people: Person[];
  records: IntakeRecord[];
  onAddPerson: (name: string, relation: string) => void;
  onChangeSettings: (settings: FamilySettings) => void;
  onCreateInvite: () => Promise<void>;
  onDeletePerson: (personId: string) => void;
  onJoinInvite: (inviteCode: string) => Promise<void>;
  onRevokeInvite: (inviteId: string) => Promise<void>;
  onUpdatePerson: (personId: string, name: string, relation: string) => void;
};

export function SettingsPanel({
  familyInvites,
  latestInviteCode,
  medicines,
  onAddPerson,
  onChangeSettings,
  onCreateInvite,
  onDeletePerson,
  onJoinInvite,
  onRevokeInvite,
  onUpdatePerson,
  people,
  records,
  settings,
}: SettingsPanelProps) {
  return (
    <section className="space-y-8">
      <StatsPanel medicines={medicines} records={records} />
      <FamilySettingsPanel
        invites={familyInvites}
        latestInviteCode={latestInviteCode}
        onChange={onChangeSettings}
        onCreateInvite={onCreateInvite}
        onJoinInvite={onJoinInvite}
        onRevokeInvite={onRevokeInvite}
        settings={settings}
      />
      <PeopleList
        onAdd={onAddPerson}
        onDelete={onDeletePerson}
        onUpdate={onUpdatePerson}
        people={people}
      />
    </section>
  );
}
