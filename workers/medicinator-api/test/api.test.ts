import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { createTestD1 } from "./d1-sqlite";
import type { Env } from "../src/types";

type FamilyResponse = { id: string; name: string; role: number };
type PersonResponse = { id: string; familyId: string; name: string; note: string | null };
type MedicineResponse = { id: string; familyId: string; personId: string; timingNames: string[] };
type IntakeResponse = {
  id: string;
  familyId: string;
  personId: string;
  medicineId: string;
  timingName: string;
  note: string | null;
  recordedByFirebaseUid: string;
};
type InviteResponse = { id: string; inviteCode: string; expiresAt: string };

function createEnv(): Env {
  return {
    DB: createTestD1(),
    FIREBASE_PROJECT_ID: "test-project",
    FRONTEND_ORIGIN: "https://app.example.com",
    AUTH_DEV_BYPASS: "true",
  };
}

async function request(env: Env, path: string, init: RequestInit = {}, user = "owner") {
  return app.request(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Development-User": user,
      ...init.headers,
    },
  }, env);
}

async function json<T>(response: Response) {
  return response.json() as Promise<T>;
}

describe("Medicinator Worker API contract", () => {
  it("rejects protected requests when authentication is missing", async () => {
    const env = { ...createEnv(), AUTH_DEV_BYPASS: "false" };

    const response = await app.request("/api/families", undefined, env);

    expect(response.status).toBe(401);
  });

  it("keeps people and intake writes inside the caller family boundary", async () => {
    const env = createEnv();
    const ownerFamily = await createFamily(env, "owner", "Sato");
    const outsiderFamily = await createFamily(env, "outsider", "Suzuki");
    const person = await createPerson(env, ownerFamily.id, "owner");
    const medicine = await createMedicine(env, ownerFamily.id, person.id, "owner");

    const readPeople = await request(env, `/api/families/${ownerFamily.id}/people`, { method: "GET" }, "outsider");
    expect(readPeople.status).toBe(403);

    const crossFamilyIntake = await request(
      env,
      `/api/families/${outsiderFamily.id}/intakes`,
      {
        method: "POST",
        body: JSON.stringify({
          personId: person.id,
          medicineId: medicine.id,
          takenAt: "2026-06-02T08:00:00.000Z",
          timingName: "Morning",
          note: null,
        }),
      },
      "outsider",
    );
    expect([403, 404]).toContain(crossFamilyIntake.status);
  });

  it("supports people create, read, update, and delete", async () => {
    const env = createEnv();
    const family = await createFamily(env, "owner", "Tanaka");

    const created = await createPerson(env, family.id, "owner", "  Mother  ", "  Primary caregiver  ");
    expect(created.name).toBe("Mother");
    expect(created.note).toBe("  Primary caregiver  ");

    const list = await json<PersonResponse[]>(await request(env, `/api/families/${family.id}/people`));
    expect(list.map((person) => person.id)).toContain(created.id);

    const updated = await json<PersonResponse>(await request(env, `/api/families/${family.id}/people/${created.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: "Mother updated", note: "" }),
    }));
    expect(updated.name).toBe("Mother updated");
    expect(updated.note).toBe("");

    const deleted = await request(env, `/api/families/${family.id}/people/${created.id}`, { method: "DELETE" });
    expect(deleted.status).toBe(204);

    const afterDelete = await json<PersonResponse[]>(await request(env, `/api/families/${family.id}/people`));
    expect(afterDelete).toHaveLength(0);
  });

  it("normalizes medicine schedules and rejects intakes for timings outside the schedule", async () => {
    const env = createEnv();
    const family = await createFamily(env, "owner", "Kato");
    const person = await createPerson(env, family.id, "owner");

    const medicine = await createMedicine(env, family.id, person.id, "owner", ["Morning", "Evening"]);
    expect(medicine.timingNames).toEqual(["Evening", "Morning"]);

    const invalidTiming = await request(env, `/api/families/${family.id}/intakes`, {
      method: "POST",
      body: JSON.stringify({
        personId: person.id,
        medicineId: medicine.id,
        takenAt: "2026-06-02T12:00:00.000Z",
        timingName: "Lunch",
        note: null,
      }),
    });
    expect(invalidTiming.status).toBe(400);
  });

  it("upserts and toggles intake records by person, medicine, day, and timing", async () => {
    const env = createEnv();
    const family = await createFamily(env, "owner", "Ito");
    const invite = await createInvite(env, family.id, "owner");
    await joinFamily(env, invite.inviteCode, "member");
    const person = await createPerson(env, family.id, "owner");
    const medicine = await createMedicine(env, family.id, person.id, "owner");

    const first = await upsertIntake(env, family.id, person.id, medicine.id, "member", "Taken after breakfast");
    const second = await upsertIntake(env, family.id, person.id, medicine.id, "member", "Updated note");
    expect(second.id).toBe(first.id);
    expect(second.note).toBe("Updated note");
    expect(second.recordedByFirebaseUid).toBe("member");

    const deleteToggle = await toggleIntake(env, family.id, person.id, medicine.id, "member");
    expect(deleteToggle.status).toBe(204);
    expect(await listIntakes(env, family.id, "member")).toHaveLength(0);

    const createToggle = await toggleIntake(env, family.id, person.id, medicine.id, "member");
    expect(createToggle.status).toBe(201);
    expect(await listIntakes(env, family.id, "member")).toHaveLength(1);
  });

  it("stores only invite code hashes and joins with normalized one-time codes", async () => {
    const env = createEnv();
    const family = await createFamily(env, "owner", "Yamada");
    const invite = await createInvite(env, family.id, "owner");

    expect(invite.inviteCode).toMatch(/^[0-9A-Z]{24}$/);

    const invites = await json<Record<string, unknown>[]>(await request(env, `/api/families/${family.id}/invites`, { method: "GET" }, "owner"));
    expect(invites[0]).not.toHaveProperty("inviteCode");
    expect(invites[0]).not.toHaveProperty("inviteCodeHash");

    const stored = await env.DB.prepare("SELECT invite_code_hash FROM family_invites WHERE id = ?").bind(invite.id).first<{ invite_code_hash: string }>();
    expect(stored?.invite_code_hash).toMatch(/^[0-9a-f]{64}$/);
    expect(stored?.invite_code_hash).not.toBe(invite.inviteCode);

    const joined = await joinFamily(env, invite.inviteCode, "member");
    expect(joined.id).toBe(family.id);
    expect(joined.role).toBe(2);

    const reuse = await request(env, "/api/families/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: invite.inviteCode, displayName: "Other" }),
    }, "other");
    expect([404, 409]).toContain(reuse.status);
  });
});

async function createFamily(env: Env, user: string, name: string) {
  const response = await request(env, "/api/families", {
    method: "POST",
    body: JSON.stringify({ name, displayName: user }),
  }, user);
  expect(response.status).toBe(201);
  return json<FamilyResponse>(response);
}

async function createPerson(env: Env, familyId: string, user: string, name = "Father", note: string | null = null) {
  const response = await request(env, `/api/families/${familyId}/people`, {
    method: "POST",
    body: JSON.stringify({ name, note }),
  }, user);
  expect(response.status).toBe(201);
  return json<PersonResponse>(response);
}

async function createMedicine(env: Env, familyId: string, personId: string, user: string, timingNames = ["Morning"]) {
  const response = await request(env, `/api/families/${familyId}/medicines`, {
    method: "POST",
    body: JSON.stringify({
      personId,
      name: "Morning tablet",
      dosageLabel: "10mg",
      usage: "After breakfast",
      startsOn: "2026-06-01",
      endsOn: null,
      timingNames,
    }),
  }, user);
  expect(response.status).toBe(201);
  return json<MedicineResponse>(response);
}

async function createInvite(env: Env, familyId: string, user: string) {
  const response = await request(env, `/api/families/${familyId}/invites`, { method: "POST" }, user);
  expect(response.status).toBe(201);
  return json<InviteResponse>(response);
}

async function joinFamily(env: Env, inviteCode: string, user: string) {
  const response = await request(env, "/api/families/join", {
    method: "POST",
    body: JSON.stringify({ inviteCode, displayName: user }),
  }, user);
  expect(response.status).toBe(200);
  return json<FamilyResponse>(response);
}

async function upsertIntake(env: Env, familyId: string, personId: string, medicineId: string, user: string, note: string) {
  const response = await request(env, `/api/families/${familyId}/intakes`, {
    method: "PUT",
    body: JSON.stringify({
      personId,
      medicineId,
      day: "2026-06-02",
      takenAt: "2026-06-02T08:00:00.000Z",
      timingName: "Morning",
      note,
    }),
  }, user);
  expect([200, 201]).toContain(response.status);
  return json<IntakeResponse>(response);
}

async function toggleIntake(env: Env, familyId: string, personId: string, medicineId: string, user: string) {
  return request(env, `/api/families/${familyId}/intakes/toggle`, {
    method: "POST",
    body: JSON.stringify({
      personId,
      medicineId,
      day: "2026-06-02",
      takenAt: "2026-06-02T08:00:00.000Z",
      timingName: "Morning",
      note: null,
    }),
  }, user);
}

async function listIntakes(env: Env, familyId: string, user: string) {
  const response = await request(env, `/api/families/${familyId}/intakes?day=2026-06-02`, { method: "GET" }, user);
  expect(response.status).toBe(200);
  return json<IntakeResponse[]>(response);
}
