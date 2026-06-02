PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS family_memberships (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  firebase_uid TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (family_id, firebase_uid),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_family_memberships_firebase_uid ON family_memberships(firebase_uid);

CREATE TABLE IF NOT EXISTS family_invites (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  invite_code_hash TEXT NOT NULL UNIQUE,
  created_by_firebase_uid TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_family_invites_family_id ON family_invites(family_id);

CREATE TABLE IF NOT EXISTS people (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  name TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_people_family_id ON people(family_id);

CREATE TABLE IF NOT EXISTS medicines (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  name TEXT NOT NULL,
  dosage_label TEXT NOT NULL,
  usage TEXT NOT NULL,
  starts_on TEXT NOT NULL,
  ends_on TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_medicines_family_id ON medicines(family_id);
CREATE INDEX IF NOT EXISTS idx_medicines_person_id ON medicines(person_id);

CREATE TABLE IF NOT EXISTS medicine_schedule_timings (
  id TEXT PRIMARY KEY,
  medicine_id TEXT NOT NULL,
  timing_name TEXT NOT NULL,
  UNIQUE (medicine_id, timing_name),
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS medication_intakes (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL,
  person_id TEXT NOT NULL,
  medicine_id TEXT NOT NULL,
  taken_on TEXT NOT NULL,
  taken_at TEXT NOT NULL,
  timing_name TEXT NOT NULL,
  note TEXT,
  recorded_by_firebase_uid TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (family_id, person_id, medicine_id, timing_name, taken_on),
  FOREIGN KEY (family_id) REFERENCES families(id) ON DELETE CASCADE,
  FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE,
  FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_medication_intakes_family_id ON medication_intakes(family_id);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_taken_on ON medication_intakes(taken_on);
CREATE INDEX IF NOT EXISTS idx_medication_intakes_taken_at ON medication_intakes(taken_at);
