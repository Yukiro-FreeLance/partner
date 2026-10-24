import type { Database, Row, TableName } from "@/lib/domain";

const PRIMARY_KEYS: Partial<Record<TableName, string>> = {
  credentials: "userId",
  userPreferences: "userId",
};

export function primaryKey(table: TableName) {
  return PRIMARY_KEYS[table] ?? "id";
}

export type Where<T> = {
  eq?: Partial<T>;
  in?: { [K in keyof T]?: T[K][] };
};

export type ListOptions = {
  limit?: number;
  orderBy?: string;
  descending?: boolean;
};

export interface Repository {
  kind: "memory" | "supabase";
  list<T extends TableName>(table: T, where?: Where<Row<T>>, options?: ListOptions): Promise<Row<T>[]>;
  find<T extends TableName>(table: T, where: Where<Row<T>>): Promise<Row<T> | null>;
  insert<T extends TableName>(table: T, row: Row<T>): Promise<Row<T>>;
  update<T extends TableName>(table: T, id: string, patch: Partial<Row<T>>): Promise<Row<T>>;
  updateWhere<T extends TableName>(table: T, where: Where<Row<T>>, patch: Partial<Row<T>>): Promise<Row<T> | null>;
  remove<T extends TableName>(table: T, id: string): Promise<void>;
  removeWhere<T extends TableName>(table: T, where: Where<Row<T>>): Promise<number>;
  transaction<T>(work: (repo: Repository) => Promise<T>): Promise<T>;
}

const openTransactions = new WeakSet<object>();

export async function runWrite<T>(repo: Repository, work: (repo: Repository) => Promise<T>): Promise<T> {
  if (openTransactions.has(repo)) return work(repo);
  return repo.transaction(async (tx) => {
    openTransactions.add(tx);
    try {
      return await work(tx);
    } finally {
      openTransactions.delete(tx);
    }
  });
}

export function rowKey(table: TableName, row: object) {
  const key = primaryKey(table);
  const value = (row as Record<string, unknown>)[key];
  if (typeof value !== "string") throw new Error(`Row in ${table} is missing ${key}`);
  return value;
}

export function matches<T extends object>(row: T, where?: Where<T>) {
  if (!where?.eq && !where?.in) return true;
  if (where.eq) {
    for (const [key, value] of Object.entries(where.eq)) {
      if (value === undefined) continue;
      if (row[key as keyof T] !== value) return false;
    }
  }
  if (where.in) {
    for (const [key, values] of Object.entries(where.in)) {
      if (!values) continue;
      const current = row[key as keyof T];
      if (!(values as unknown[]).includes(current)) return false;
    }
  }
  return true;
}
