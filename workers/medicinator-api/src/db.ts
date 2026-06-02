export async function first<T>(db: D1Database, sql: string, values: unknown[] = []) {
  return db.prepare(sql).bind(...values).first<T>();
}

export async function all<T>(db: D1Database, sql: string, values: unknown[] = []) {
  const result = await db.prepare(sql).bind(...values).all<T>();
  return result.results ?? [];
}

export async function run(db: D1Database, sql: string, values: unknown[] = []) {
  return db.prepare(sql).bind(...values).run();
}

export function nowIso() {
  return new Date().toISOString();
}

export function addDaysIso(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString();
}
