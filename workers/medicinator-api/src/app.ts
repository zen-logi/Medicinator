import { Hono } from "hono";
import { cors } from "hono/cors";
import { authenticate } from "./auth";
import { addDaysIso, all, first, nowIso, run } from "./db";
import { badRequest, conflict, forbidden, HttpError, notFound, readJson } from "./http";
import { createInviteCode, sha256Hex } from "./security";
import { familyRoles, type Env, type FamilyRole, type Variables } from "./types";

type AppContext = { Bindings: Env; Variables: Variables };

type MembershipRow = {
  family_id: string;
  role: FamilyRole;
};

type FamilyRow = {
  id: string;
  name: string;
  role: FamilyRole;
};

type InviteRow = {
  id: string;
  family_id: string;
  created_by_firebase_uid: string;
  created_at: string;
  expires_at: string;
  used_at: string | null;
  revoked_at: string | null;
};

type PersonRow = {
  id: string;
  family_id: string;
  name: string;
  note: string | null;
  created_at: string;
};

type MedicineRow = {
  id: string;
  family_id: string;
  person_id: string;
  name: string;
  dosage_label: string;
  usage: string;
  prescribed_quantity: number;
  starts_on: string;
  ends_on: string | null;
  created_at: string;
};

type IntakeRow = {
  id: string;
  family_id: string;
  person_id: string;
  person_name: string;
  medicine_id: string;
  medicine_name: string;
  taken_on: string;
  taken_at: string;
  timing_name: string;
  note: string | null;
  recorded_by_firebase_uid: string;
  created_at: string;
};

export function createApp() {
  return new Hono<AppContext>();
}

export const app = createApp();

app.use("*", async (context, next) => {
  const origin = context.env.FRONTEND_ORIGIN || "https://app.example.com";
  return cors({
    origin,
    allowHeaders: ["Authorization", "Content-Type", "X-Development-User"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })(context, next);
});

app.onError((error, context) => {
  if (error instanceof HttpError) {
    return context.json(
      { status: error.status, title: error.message },
      { status: error.status as 400 | 401 | 403 | 404 | 409 },
    );
  }

  console.error(error);
  return context.json({ status: 500, title: "Internal server error" }, 500);
});

app.get("/health", (context) => context.json({ status: "Healthy" }));

app.use("/api/*", authenticate);

app.get("/api/me", async (context) => {
  const firebaseUid = context.get("firebaseUid");
  const families = await getFamilies(context.env.DB, firebaseUid);
  return context.json({ firebaseUid, families });
});

app.get("/api/families", async (context) => {
  return context.json(await getFamilies(context.env.DB, context.get("firebaseUid")));
});

app.post("/api/families", async (context) => {
  const body = await readJson<{ name?: string; displayName?: string }>(context);
  const name = requireText(body.name, "name");
  const displayName = requireText(body.displayName, "displayName");
  const id = crypto.randomUUID();
  const membershipId = crypto.randomUUID();
  const createdAt = nowIso();

  await run(context.env.DB, "INSERT INTO families (id, name, created_at) VALUES (?, ?, ?)", [id, name, createdAt]);
  await run(
    context.env.DB,
    "INSERT INTO family_memberships (id, family_id, firebase_uid, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    [membershipId, id, context.get("firebaseUid"), displayName, familyRoles.owner, createdAt],
  );

  return context.json({ id, name, role: familyRoles.owner }, 201);
});

app.post("/api/families/join", async (context) => {
  const body = await readJson<{ inviteCode?: string; displayName?: string }>(context);
  const inviteCode = normalizeInviteCode(requireText(body.inviteCode, "inviteCode"));
  const displayName = requireText(body.displayName, "displayName");
  const inviteCodeHash = await sha256Hex(inviteCode);
  const invite = await first<InviteRow>(
    context.env.DB,
    "SELECT * FROM family_invites WHERE invite_code_hash = ?",
    [inviteCodeHash],
  );

  if (!invite || invite.used_at || invite.revoked_at || new Date(invite.expires_at).getTime() < Date.now()) {
    throw notFound("Invite is not available");
  }

  const firebaseUid = context.get("firebaseUid");
  const existing = await first<MembershipRow>(
    context.env.DB,
    "SELECT family_id, role FROM family_memberships WHERE family_id = ? AND firebase_uid = ?",
    [invite.family_id, firebaseUid],
  );

  if (!existing) {
    await run(
      context.env.DB,
      "INSERT INTO family_memberships (id, family_id, firebase_uid, display_name, role, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      [crypto.randomUUID(), invite.family_id, firebaseUid, displayName, familyRoles.member, nowIso()],
    );
  }

  await run(context.env.DB, "UPDATE family_invites SET used_at = ? WHERE id = ?", [nowIso(), invite.id]);
  const family = await first<{ id: string; name: string }>(context.env.DB, "SELECT id, name FROM families WHERE id = ?", [
    invite.family_id,
  ]);
  if (!family) {
    throw notFound("Family not found");
  }

  return context.json({ id: family.id, name: family.name, role: existing?.role ?? familyRoles.member });
});

app.get("/api/families/:familyId/invites", async (context) => {
  const familyId = context.req.param("familyId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  const invites = await all<InviteRow>(
    context.env.DB,
    "SELECT id, family_id, created_by_firebase_uid, created_at, expires_at, used_at, revoked_at FROM family_invites WHERE family_id = ? ORDER BY created_at DESC",
    [familyId],
  );
  return context.json(invites.map(toInviteResponse));
});

app.post("/api/families/:familyId/invites", async (context) => {
  const familyId = context.req.param("familyId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  const { inviteCode, inviteCodeHash } = await createUniqueInviteCode(context.env.DB);
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  const expiresAt = addDaysIso(7);
  await run(
    context.env.DB,
    "INSERT INTO family_invites (id, family_id, invite_code_hash, created_by_firebase_uid, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
    [id, familyId, inviteCodeHash, context.get("firebaseUid"), createdAt, expiresAt],
  );

  return context.json({ id, inviteCode, expiresAt }, 201);
});

app.delete("/api/families/:familyId/invites/:inviteId", async (context) => {
  const familyId = context.req.param("familyId");
  const inviteId = context.req.param("inviteId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  const invite = await first<{ id: string }>(
    context.env.DB,
    "SELECT id FROM family_invites WHERE id = ? AND family_id = ?",
    [inviteId, familyId],
  );
  if (!invite) {
    throw notFound("Invite not found");
  }

  await run(context.env.DB, "UPDATE family_invites SET revoked_at = ? WHERE id = ? AND family_id = ?", [
    nowIso(),
    inviteId,
    familyId,
  ]);
  return new Response(null, { status: 204 });
});

app.get("/api/families/:familyId/people", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  const people = await all<PersonRow>(context.env.DB, "SELECT * FROM people WHERE family_id = ? ORDER BY name", [
    familyId,
  ]);
  return context.json(people.map(toPersonResponse));
});

app.post("/api/families/:familyId/people", async (context) => {
  const familyId = context.req.param("familyId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  const body = await readJson<{ name?: string; note?: string | null }>(context);
  const person = {
    id: crypto.randomUUID(),
    family_id: familyId,
    name: requireText(body.name, "name"),
    note: body.note ?? null,
    created_at: nowIso(),
  };
  await run(context.env.DB, "INSERT INTO people (id, family_id, name, note, created_at) VALUES (?, ?, ?, ?, ?)", [
    person.id,
    person.family_id,
    person.name,
    person.note,
    person.created_at,
  ]);
  return context.json(toPersonResponse(person), 201);
});

app.put("/api/families/:familyId/people/:personId", async (context) => {
  const familyId = context.req.param("familyId");
  const personId = context.req.param("personId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  const body = await readJson<{ name?: string; note?: string | null }>(context);
  await requirePerson(context.env.DB, familyId, personId);
  await run(context.env.DB, "UPDATE people SET name = ?, note = ? WHERE id = ? AND family_id = ?", [
    requireText(body.name, "name"),
    body.note ?? null,
    personId,
    familyId,
  ]);
  const person = await requirePerson(context.env.DB, familyId, personId);
  return context.json(toPersonResponse(person));
});

app.delete("/api/families/:familyId/people/:personId", async (context) => {
  const familyId = context.req.param("familyId");
  const personId = context.req.param("personId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  await requirePerson(context.env.DB, familyId, personId);
  const medicine = await first<{ id: string }>(
    context.env.DB,
    "SELECT id FROM medicines WHERE family_id = ? AND person_id = ?",
    [familyId, personId],
  );
  const intake = await first<{ id: string }>(
    context.env.DB,
    "SELECT id FROM medication_intakes WHERE family_id = ? AND person_id = ?",
    [familyId, personId],
  );
  if (medicine || intake) {
    throw conflict("Person has medicines or intakes");
  }

  await run(context.env.DB, "DELETE FROM people WHERE id = ? AND family_id = ?", [personId, familyId]);
  return new Response(null, { status: 204 });
});

app.get("/api/families/:familyId/medicines", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  return context.json(await getMedicineResponses(context.env.DB, familyId));
});

app.post("/api/families/:familyId/medicines", async (context) => {
  const familyId = context.req.param("familyId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  const body = await readJson<MedicineRequest>(context);
  const id = crypto.randomUUID();
  await saveMedicine(context.env.DB, familyId, id, body, false);
  const medicine = await getMedicineResponse(context.env.DB, familyId, id);
  return context.json(medicine, 201);
});

app.put("/api/families/:familyId/medicines/:medicineId", async (context) => {
  const familyId = context.req.param("familyId");
  const medicineId = context.req.param("medicineId");
  await requireAdmin(context.env.DB, familyId, context.get("firebaseUid"));
  await requireMedicine(context.env.DB, familyId, medicineId);
  const body = await readJson<MedicineRequest>(context);
  await saveMedicine(context.env.DB, familyId, medicineId, body, true);
  return context.json(await getMedicineResponse(context.env.DB, familyId, medicineId));
});

app.get("/api/families/:familyId/intakes", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  const day = context.req.query("day");
  const where = day ? "WHERE i.family_id = ? AND i.taken_on = ?" : "WHERE i.family_id = ?";
  const values = day ? [familyId, day] : [familyId];
  const rows = await all<IntakeRow>(
    context.env.DB,
    `SELECT i.*, p.name AS person_name, m.name AS medicine_name
     FROM medication_intakes i
     JOIN people p ON p.id = i.person_id
     JOIN medicines m ON m.id = i.medicine_id
     ${where}
     ORDER BY i.taken_at DESC`,
    values,
  );
  return context.json(rows.map(toIntakeResponse));
});

app.post("/api/families/:familyId/intakes", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  const body = await readJson<IntakeRequest>(context);
  await validateIntakeTarget(context.env.DB, familyId, body);
  const id = crypto.randomUUID();
  const createdAt = nowIso();
  await run(
    context.env.DB,
    "INSERT INTO medication_intakes (id, family_id, person_id, medicine_id, taken_on, taken_at, timing_name, note, recorded_by_firebase_uid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, familyId, body.personId, body.medicineId, getIntakeDay(body), body.takenAt, requireText(body.timingName, "timingName"), body.note ?? null, context.get("firebaseUid"), createdAt],
  );
  const intake = await getIntake(context.env.DB, familyId, id);
  return context.json(intake, 201);
});

app.put("/api/families/:familyId/intakes", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  const body = await readJson<IntakeRequest>(context);
  await validateIntakeTarget(context.env.DB, familyId, body);
  const day = getIntakeDay(body);
  const timingName = requireText(body.timingName, "timingName");
  const existing = await first<{ id: string }>(
    context.env.DB,
    "SELECT id FROM medication_intakes WHERE family_id = ? AND person_id = ? AND medicine_id = ? AND taken_on = ? AND timing_name = ?",
    [familyId, body.personId, body.medicineId, day, timingName],
  );

  if (existing) {
    await run(
      context.env.DB,
      "UPDATE medication_intakes SET taken_at = ?, note = ?, recorded_by_firebase_uid = ? WHERE id = ?",
      [body.takenAt, body.note ?? null, context.get("firebaseUid"), existing.id],
    );
    return context.json(await getIntake(context.env.DB, familyId, existing.id));
  }

  const id = crypto.randomUUID();
  await run(
    context.env.DB,
    "INSERT INTO medication_intakes (id, family_id, person_id, medicine_id, taken_on, taken_at, timing_name, note, recorded_by_firebase_uid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, familyId, body.personId, body.medicineId, day, body.takenAt, timingName, body.note ?? null, context.get("firebaseUid"), nowIso()],
  );
  return context.json(await getIntake(context.env.DB, familyId, id), 201);
});

app.post("/api/families/:familyId/intakes/toggle", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  const body = await readJson<IntakeRequest>(context);
  await validateIntakeTarget(context.env.DB, familyId, body);
  const day = getIntakeDay(body);
  const timingName = requireText(body.timingName, "timingName");
  const existing = await first<{ id: string }>(
    context.env.DB,
    "SELECT id FROM medication_intakes WHERE family_id = ? AND person_id = ? AND medicine_id = ? AND taken_on = ? AND timing_name = ?",
    [familyId, body.personId, body.medicineId, day, timingName],
  );

  if (existing) {
    await run(context.env.DB, "DELETE FROM medication_intakes WHERE id = ?", [existing.id]);
    return new Response(null, { status: 204 });
  }

  const id = crypto.randomUUID();
  await run(
    context.env.DB,
    "INSERT INTO medication_intakes (id, family_id, person_id, medicine_id, taken_on, taken_at, timing_name, note, recorded_by_firebase_uid, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, familyId, body.personId, body.medicineId, day, body.takenAt, timingName, body.note ?? null, context.get("firebaseUid"), nowIso()],
  );
  return context.json(await getIntake(context.env.DB, familyId, id), 201);
});

app.delete("/api/families/:familyId/intakes", async (context) => {
  const familyId = context.req.param("familyId");
  await requireMember(context.env.DB, familyId, context.get("firebaseUid"));
  const personId = requireText(context.req.query("personId"), "personId");
  const medicineId = requireText(context.req.query("medicineId"), "medicineId");
  const day = requireText(context.req.query("day"), "day");
  const timingName = requireText(context.req.query("timingName"), "timingName");
  await run(
    context.env.DB,
    "DELETE FROM medication_intakes WHERE family_id = ? AND person_id = ? AND medicine_id = ? AND taken_on = ? AND timing_name = ?",
    [familyId, personId, medicineId, day, timingName],
  );
  return new Response(null, { status: 204 });
});

async function getFamilies(db: D1Database, firebaseUid: string) {
  const rows = await all<FamilyRow>(
    db,
    `SELECT f.id, f.name, m.role
     FROM families f
     JOIN family_memberships m ON m.family_id = f.id
     WHERE m.firebase_uid = ?
     ORDER BY f.created_at`,
    [firebaseUid],
  );
  return rows.map((row) => ({ id: row.id, name: row.name, role: row.role }));
}

async function requireMember(db: D1Database, familyId: string, firebaseUid: string) {
  const membership = await first<MembershipRow>(
    db,
    "SELECT family_id, role FROM family_memberships WHERE family_id = ? AND firebase_uid = ?",
    [familyId, firebaseUid],
  );
  if (!membership) {
    throw forbidden();
  }
  return membership;
}

async function requireAdmin(db: D1Database, familyId: string, firebaseUid: string) {
  const membership = await requireMember(db, familyId, firebaseUid);
  if (membership.role !== familyRoles.owner && membership.role !== familyRoles.admin) {
    throw forbidden();
  }
  return membership;
}

async function requirePerson(db: D1Database, familyId: string, personId: string) {
  const person = await first<PersonRow>(db, "SELECT * FROM people WHERE id = ? AND family_id = ?", [personId, familyId]);
  if (!person) {
    throw notFound("Person not found");
  }
  return person;
}

async function requireMedicine(db: D1Database, familyId: string, medicineId: string) {
  const medicine = await first<MedicineRow>(db, "SELECT * FROM medicines WHERE id = ? AND family_id = ?", [medicineId, familyId]);
  if (!medicine) {
    throw notFound("Medicine not found");
  }
  return medicine;
}

async function createUniqueInviteCode(db: D1Database) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const inviteCode = createInviteCode();
    const inviteCodeHash = await sha256Hex(inviteCode);
    const existing = await first<{ id: string }>(
      db,
      "SELECT id FROM family_invites WHERE invite_code_hash = ?",
      [inviteCodeHash],
    );
    if (!existing) {
      return { inviteCode, inviteCodeHash };
    }
  }

  throw conflict("Invite code could not be created");
}

type MedicineRequest = {
  personId?: string;
  name?: string;
  dosageLabel?: string;
  usage?: string;
  prescribedQuantity?: number | null;
  startsOn?: string;
  endsOn?: string | null;
  timingNames?: string[];
};

type IntakeRequest = {
  personId: string;
  medicineId: string;
  day?: string;
  takenAt: string;
  timingName: string;
  note?: string | null;
};

async function saveMedicine(db: D1Database, familyId: string, id: string, body: MedicineRequest, update: boolean) {
  const personId = requireText(body.personId, "personId");
  await requirePerson(db, familyId, personId);
  const timingNames = normalizeTimingNames(body.timingNames ?? []);
  const prescribedQuantity = normalizePrescribedQuantity(body.prescribedQuantity);
  if (timingNames.length === 0) {
    throw badRequest("timingNames is required");
  }

  if (update) {
    await run(
      db,
      "UPDATE medicines SET person_id = ?, name = ?, dosage_label = ?, usage = ?, prescribed_quantity = ?, starts_on = ?, ends_on = ? WHERE id = ? AND family_id = ?",
      [personId, requireText(body.name, "name"), requireText(body.dosageLabel, "dosageLabel"), requireText(body.usage, "usage"), prescribedQuantity, requireText(body.startsOn, "startsOn"), body.endsOn ?? null, id, familyId],
    );
    await run(db, "DELETE FROM medicine_schedule_timings WHERE medicine_id = ?", [id]);
  } else {
    await run(
      db,
      "INSERT INTO medicines (id, family_id, person_id, name, dosage_label, usage, prescribed_quantity, starts_on, ends_on, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [id, familyId, personId, requireText(body.name, "name"), requireText(body.dosageLabel, "dosageLabel"), requireText(body.usage, "usage"), prescribedQuantity, requireText(body.startsOn, "startsOn"), body.endsOn ?? null, nowIso()],
    );
  }

  for (const timingName of timingNames) {
    await run(db, "INSERT INTO medicine_schedule_timings (id, medicine_id, timing_name) VALUES (?, ?, ?)", [
      crypto.randomUUID(),
      id,
      timingName,
    ]);
  }
}

function normalizePrescribedQuantity(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (!Number.isInteger(value) || value < 0) {
    throw badRequest("prescribedQuantity must be a non-negative integer");
  }

  return value;
}

async function validateIntakeTarget(db: D1Database, familyId: string, body: IntakeRequest) {
  await requirePerson(db, familyId, body.personId);
  const medicine = await requireMedicine(db, familyId, body.medicineId);
  if (medicine.person_id !== body.personId) {
    throw notFound("Medicine or person not found");
  }

  const timingName = requireText(body.timingName, "timingName");
  const timing = await first<{ timing_name: string }>(
    db,
    "SELECT timing_name FROM medicine_schedule_timings WHERE medicine_id = ? AND timing_name = ?",
    [body.medicineId, timingName],
  );
  if (!timing) {
    throw badRequest("timingName is not scheduled for this medicine");
  }
}

function getIntakeDay(body: IntakeRequest) {
  return requireText(body.day ?? body.takenAt.slice(0, 10), "day");
}

async function getMedicineResponses(db: D1Database, familyId: string) {
  const medicines = await all<MedicineRow>(db, "SELECT * FROM medicines WHERE family_id = ? ORDER BY created_at", [familyId]);
  return Promise.all(medicines.map((medicine) => toMedicineResponse(db, medicine)));
}

async function getMedicineResponse(db: D1Database, familyId: string, medicineId: string) {
  return toMedicineResponse(db, await requireMedicine(db, familyId, medicineId));
}

async function toMedicineResponse(db: D1Database, medicine: MedicineRow) {
  const timings = await all<{ timing_name: string }>(
    db,
    "SELECT timing_name FROM medicine_schedule_timings WHERE medicine_id = ? ORDER BY timing_name",
    [medicine.id],
  );
  return {
    id: medicine.id,
    familyId: medicine.family_id,
    personId: medicine.person_id,
    name: medicine.name,
    dosageLabel: medicine.dosage_label,
    usage: medicine.usage,
    prescribedQuantity: medicine.prescribed_quantity,
    startsOn: medicine.starts_on,
    endsOn: medicine.ends_on,
    timingNames: timings.map((timing) => timing.timing_name),
    createdAt: medicine.created_at,
  };
}

async function getIntake(db: D1Database, familyId: string, intakeId: string) {
  const row = await first<IntakeRow>(
    db,
    `SELECT i.*, p.name AS person_name, m.name AS medicine_name
     FROM medication_intakes i
     JOIN people p ON p.id = i.person_id
     JOIN medicines m ON m.id = i.medicine_id
     WHERE i.id = ? AND i.family_id = ?`,
    [intakeId, familyId],
  );
  if (!row) {
    throw notFound("Intake not found");
  }
  return toIntakeResponse(row);
}

function toInviteResponse(invite: InviteRow) {
  return {
    id: invite.id,
    familyId: invite.family_id,
    createdByFirebaseUid: invite.created_by_firebase_uid,
    createdAt: invite.created_at,
    expiresAt: invite.expires_at,
    usedAt: invite.used_at,
    revokedAt: invite.revoked_at,
  };
}

function toPersonResponse(person: PersonRow) {
  return {
    id: person.id,
    familyId: person.family_id,
    name: person.name,
    note: person.note,
    createdAt: person.created_at,
  };
}

function toIntakeResponse(intake: IntakeRow) {
  return {
    id: intake.id,
    familyId: intake.family_id,
    personId: intake.person_id,
    personName: intake.person_name,
    medicineId: intake.medicine_id,
    medicineName: intake.medicine_name,
    takenAt: intake.taken_at,
    timingName: intake.timing_name,
    note: intake.note,
    recordedByFirebaseUid: intake.recorded_by_firebase_uid,
    createdAt: intake.created_at,
  };
}

function requireText(value: string | undefined | null, name: string) {
  if (!value || value.trim().length === 0) {
    throw badRequest(`${name} is required`);
  }
  return value.trim();
}

function normalizeTimingNames(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort();
}

function normalizeInviteCode(value: string) {
  return value.replaceAll("-", "").replaceAll(" ", "").toUpperCase();
}
