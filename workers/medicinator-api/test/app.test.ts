import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { createTestD1 } from "./d1-sqlite";
import type { Env } from "../src/types";

function createEnv(): Env {
  return {
    DB: createTestD1(),
    FIREBASE_PROJECT_ID: "test-project",
    FRONTEND_ORIGIN: "https://app.example.com",
    AUTH_DEV_BYPASS: "true",
  };
}

async function request(env: Env, path: string, init: RequestInit = {}, user = "user-1") {
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

type FamilyResponse = {
  id: string;
  name: string;
  role: number;
};

type PersonResponse = {
  id: string;
  familyId: string;
  name: string;
};

type MedicineResponse = {
  id: string;
  personId: string;
  prescribedQuantity: number;
  timingNames: string[];
};

type IntakeResponse = {
  id: string;
  personName: string;
  medicineName: string;
  timingName: string;
};

describe("Medicinator Worker API", () => {
  it("rejects unauthenticated API requests", async () => {
    const env = createEnv();
    const response = await app.request("/api/me", undefined, { ...env, AUTH_DEV_BYPASS: "false" });

    expect(response.status).toBe(401);
  });

  it("creates a family and returns it from me endpoint", async () => {
    const env = createEnv();
    const created = await request(env, "/api/families", {
      method: "POST",
      body: JSON.stringify({ name: "山田家", displayName: "春子" }),
    });

    expect(created.status).toBe(201);
    const family = await json<FamilyResponse>(created);
    expect(family.name).toBe("山田家");
    expect(family.role).toBe(1);

    const me = await json<{ firebaseUid: string; families: FamilyResponse[] }>(await request(env, "/api/me"));
    expect(me.firebaseUid).toBe("user-1");
    expect(me.families).toHaveLength(1);
    expect(me.families[0]?.id).toBe(family.id);
  });

  it("prevents another family from reading protected data", async () => {
    const env = createEnv();
    const family = await json<FamilyResponse>(await request(env, "/api/families", {
      method: "POST",
      body: JSON.stringify({ name: "山田家", displayName: "春子" }),
    }));

    const response = await request(env, `/api/families/${family.id}/people`, {}, "other-user");

    expect(response.status).toBe(403);
  });

  it("creates, updates, and deletes people", async () => {
    const env = createEnv();
    const family = await createFamily(env);
    const created = await json<PersonResponse>(await request(env, `/api/families/${family.id}/people`, {
      method: "POST",
      body: JSON.stringify({ name: "春子", note: "朝は水多め" }),
    }));

    expect(created.name).toBe("春子");

    const updated = await json<PersonResponse>(await request(env, `/api/families/${family.id}/people/${created.id}`, {
      method: "PUT",
      body: JSON.stringify({ name: "太郎", note: null }),
    }));
    expect(updated.name).toBe("太郎");

    const deleted = await request(env, `/api/families/${family.id}/people/${created.id}`, { method: "DELETE" });
    expect(deleted.status).toBe(204);
  });

  it("creates medicine schedules and records an intake", async () => {
    const env = createEnv();
    const family = await createFamily(env);
    const person = await createPerson(env, family.id);

    const medicine = await json<MedicineResponse>(await request(env, `/api/families/${family.id}/medicines`, {
      method: "POST",
      body: JSON.stringify({
        personId: person.id,
        name: "アムロジピン",
        dosageLabel: "5mg / 1錠",
        prescribedQuantity: 28,
        usage: "食後",
        startsOn: "2026-06-01",
        endsOn: null,
        timingNames: ["朝食後", "夕食後"],
      }),
    }));

    expect(medicine.personId).toBe(person.id);
    expect(medicine.prescribedQuantity).toBe(28);
    expect(medicine.timingNames).toEqual(["夕食後", "朝食後"]);

    const intake = await json<IntakeResponse>(await request(env, `/api/families/${family.id}/intakes`, {
      method: "POST",
      body: JSON.stringify({
        personId: person.id,
        medicineId: medicine.id,
        takenAt: "2026-06-02T08:00:00.000Z",
        timingName: "朝食後",
        note: "OK",
      }),
    }));

    expect(intake.personName).toBe("春子");
    expect(intake.medicineName).toBe("アムロジピン");

    const list = await json<IntakeResponse[]>(await request(env, `/api/families/${family.id}/intakes?day=2026-06-02`));
    expect(list).toHaveLength(1);
    expect(list[0]?.timingName).toBe("朝食後");

    const deleted = await request(
      env,
      `/api/families/${family.id}/intakes?personId=${person.id}&medicineId=${medicine.id}&day=2026-06-02&timingName=${encodeURIComponent("朝食後")}`,
      { method: "DELETE" },
    );
    expect(deleted.status).toBe(204);
  });

  it("creates one-time hashed invites and lets another user join", async () => {
    const env = createEnv();
    const family = await createFamily(env);
    const invite = await json<{ id: string; inviteCode: string }>(await request(env, `/api/families/${family.id}/invites`, {
      method: "POST",
    }));

    expect(invite.inviteCode).toBeTruthy();

    const join = await json<FamilyResponse>(await request(env, "/api/families/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: invite.inviteCode, displayName: "次郎" }),
    }, "user-2"));

    expect(join.id).toBe(family.id);
    expect(join.role).toBe(2);

    const reused = await request(env, "/api/families/join", {
      method: "POST",
      body: JSON.stringify({ inviteCode: invite.inviteCode, displayName: "三郎" }),
    }, "user-3");
    expect(reused.status).toBe(404);
  });
});

async function createFamily(env: Env) {
  return json<FamilyResponse>(await request(env, "/api/families", {
    method: "POST",
    body: JSON.stringify({ name: "山田家", displayName: "春子" }),
  }));
}

async function createPerson(env: Env, familyId: string) {
  return json<PersonResponse>(await request(env, `/api/families/${familyId}/people`, {
    method: "POST",
    body: JSON.stringify({ name: "春子", note: null }),
  }));
}
