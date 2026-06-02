import { useState } from "react";
import { Bell, ChevronDown, Copy, Home, Link2, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/components/card";
import { Input } from "@/shared/components/input";
import type { FamilyInvite, FamilySettings } from "@/shared/types/domain";

type FamilySettingsPanelProps = {
  invites: FamilyInvite[];
  latestInviteCode?: string;
  settings: FamilySettings;
  onChange: (settings: FamilySettings) => void;
  onCreateInvite: () => Promise<void>;
  onJoinInvite: (inviteCode: string) => Promise<void>;
  onRevokeInvite: (inviteId: string) => Promise<void>;
};

const timeZones = [
  { label: "日本時間", value: "Asia/Tokyo" },
  { label: "UTC", value: "UTC" },
  { label: "米国西部", value: "America/Los_Angeles" },
  { label: "米国東部", value: "America/New_York" },
  { label: "ロンドン", value: "Europe/London" },
  { label: "シンガポール", value: "Asia/Singapore" },
];

export function FamilySettingsPanel({
  invites,
  latestInviteCode,
  onChange,
  onCreateInvite,
  onJoinInvite,
  onRevokeInvite,
  settings,
}: FamilySettingsPanelProps) {
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const activeInvites = invites.filter(
    (invite) =>
      !invite.usedAt &&
      !invite.revokedAt &&
      new Date(invite.expiresAt) > new Date(),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Family</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block space-y-2 text-sm font-medium">
            <span className="inline-flex items-center gap-2">
              <Home aria-hidden className="h-4 w-4" />
              家族名
            </span>
            <Input
              onChange={(event) =>
                onChange({ ...settings, familyName: event.target.value })
              }
              value={settings.familyName}
            />
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>タイムゾーン</span>
            <span className="relative block">
              <select
                className="h-10 w-full appearance-none rounded-md border border-input bg-white px-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                onChange={(event) =>
                  onChange({ ...settings, timezone: event.target.value })
                }
                value={settings.timezone}
              >
                {timeZones.map((timeZone) => (
                  <option key={timeZone.value} value={timeZone.value}>
                    {timeZone.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                aria-hidden
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
            </span>
          </label>
          <label className="flex items-center gap-3 rounded-lg border border-zinc-100 bg-white p-4 text-sm font-medium">
            <input
              checked={settings.reminderEnabled}
              className="h-4 w-4 rounded border-input text-primary"
              onChange={(event) =>
                onChange({ ...settings, reminderEnabled: event.target.checked })
              }
              type="checkbox"
            />
            <span className="inline-flex items-center gap-2">
              <Bell aria-hidden className="h-4 w-4" />
              リマインドを有効にする
            </span>
          </label>
          <label className="block space-y-2 text-sm font-medium">
            <span>何分前に通知</span>
            <Input
              min={0}
              onChange={(event) =>
                onChange({
                  ...settings,
                  reminderLeadMinutes:
                    Number.parseInt(event.target.value, 10) || 0,
                })
              }
              type="number"
              value={settings.reminderLeadMinutes}
            />
          </label>
        </div>
        <Button className="mt-6 rounded-full" type="button" variant="secondary">
          設定を保存
        </Button>

        <div className="mt-8 border-t border-pink-100 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="inline-flex items-center gap-2 text-base font-semibold text-pink-950">
                <Link2 aria-hidden className="h-4 w-4 text-pink-500" />
                招待
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                作成直後だけコードを表示します。
              </p>
            </div>
            <Button onClick={() => void onCreateInvite()} type="button">
              招待を作成
            </Button>
          </div>

          {latestInviteCode && (
            <div className="motion-enter mt-5 rounded-lg border border-emerald-100 bg-emerald-50/80 p-4">
              <p className="text-xs font-semibold text-emerald-700">
                新しい招待コード
              </p>
              <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <code className="rounded-md bg-white/80 px-3 py-2 text-base font-semibold text-emerald-950">
                  {latestInviteCode}
                </code>
                <Button
                  onClick={() =>
                    void navigator.clipboard?.writeText(latestInviteCode)
                  }
                  type="button"
                  variant="secondary"
                >
                  <Copy aria-hidden className="h-4 w-4" />
                  コピー
                </Button>
              </div>
            </div>
          )}

          <div className="mt-5 space-y-3">
            {activeInvites.length === 0 ? (
              <p className="rounded-lg border border-dashed border-pink-100 bg-white/60 p-4 text-sm text-muted-foreground">
                有効な招待はありません。
              </p>
            ) : (
              activeInvites.map((invite) => (
                <div
                  className="flex flex-col gap-3 rounded-lg border border-pink-100 bg-white/70 p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={invite.id}
                >
                  <div>
                    <p className="text-sm font-semibold text-pink-950">
                      {new Intl.DateTimeFormat("ja-JP", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(invite.expiresAt))}
                      まで有効
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      作成者: {invite.createdByFirebaseUid}
                    </p>
                  </div>
                  <Button
                    onClick={() => void onRevokeInvite(invite.id)}
                    type="button"
                    variant="ghost"
                  >
                    <Trash2 aria-hidden className="h-4 w-4" />
                    失効
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="mt-6 rounded-lg border border-pink-100 bg-white/70 p-4">
            <label className="block space-y-2 text-sm font-medium">
              <span>招待コードで参加</span>
              <Input
                onChange={(event) => setJoinInviteCode(event.target.value)}
                placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX"
                value={joinInviteCode}
              />
            </label>
            <Button
              className="mt-3"
              disabled={joinInviteCode.trim().length === 0}
              onClick={() => {
                void onJoinInvite(joinInviteCode);
                setJoinInviteCode("");
              }}
              type="button"
              variant="secondary"
            >
              参加
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
