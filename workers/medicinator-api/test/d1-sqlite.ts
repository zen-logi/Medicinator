import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

class SqliteD1Statement {
  private values: unknown[] = [];

  constructor(
    private readonly database: DatabaseSync,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async first<T = unknown>() {
    return (this.database.prepare(this.sql).get(...this.values) ?? null) as T | null;
  }

  async all<T = unknown>() {
    const results = this.database.prepare(this.sql).all(...this.values) as T[];
    return { results, meta: createMeta(), success: true };
  }

  async run() {
    this.database.prepare(this.sql).run(...this.values);
    return { results: [], meta: createMeta(), success: true };
  }

  raw<T = unknown>(): Promise<T[]> {
    throw new Error("raw is not implemented in test D1 mock");
  }
}

export function createTestD1() {
  const database = new DatabaseSync(":memory:");
  const migration = readFileSync(join(process.cwd(), "migrations", "0001_initial.sql"), "utf8");
  database.exec(migration);

  return {
    prepare(sql: string) {
      return new SqliteD1Statement(database, sql) as unknown as D1PreparedStatement;
    },
    batch() {
      throw new Error("batch is not implemented in test D1 mock");
    },
    dump() {
      throw new Error("dump is not implemented in test D1 mock");
    },
    exec(sql: string) {
      database.exec(sql);
      return Promise.resolve({ count: 0, duration: 0 });
    },
  } as unknown as D1Database;
}

function createMeta(): D1Meta {
  return {
    duration: 0,
    size_after: 0,
    rows_read: 0,
    rows_written: 0,
    last_row_id: 0,
    changed_db: false,
    changes: 0,
  };
}
