export type Env = {
  DB: D1Database;
  FIREBASE_PROJECT_ID: string;
  FRONTEND_ORIGIN: string;
  AUTH_DEV_BYPASS?: string;
};

export type Variables = {
  firebaseUid: string;
};

export type FamilyRole = 1 | 2 | 3;

export const familyRoles = {
  owner: 1,
  member: 2,
  admin: 3,
} as const;
