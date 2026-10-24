import { createClient } from "@supabase/supabase-js";
import { supabaseUrl } from "@/lib/config";
import { keysToCamel, keysToSnake, toSnake } from "@/lib/data/case";
import { primaryKey, type Repository } from "@/lib/data/repository";
import type { Row, TableName } from "@/lib/domain";

export function createSupabaseRepository(): Repository {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key || !supabaseUrl()) throw new Error("Supabase URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  const client = createClient(supabaseUrl(), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const repo: Repository = {
    kind: "supabase",
    async list(table, where, options) {
      let query = client.from(toSnake(table)).select("*");
      query = applyWhere(query, where);
      if (options?.orderBy) query = query.order(toSnake(options.orderBy), { ascending: !options.descending });
      if (options?.limit) query = query.limit(options.limit);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => keysToCamel<Row<TableName>>(row)) as Row<typeof table>[];
    },
    async find(table, where) {
      const rows = await repo.list(table, where, { limit: 1 });
      return rows[0] ?? null;
    },
    async insert(table, row) {
      const { data, error } = await client.from(toSnake(table)).insert(keysToSnake(row)).select("*").single();
      if (error) throw new Error(error.message);
      return keysToCamel(data);
    },
    async update(table, id, patch) {
      const { data, error } = await client.from(toSnake(table)).update(keysToSnake(patch)).eq(toSnake(primaryKey(table)), id).select("*").single();
      if (error) throw new Error(error.message);
      return keysToCamel(data);
    },
    async updateWhere(table, where, patch) {
      let query = client.from(toSnake(table)).update(keysToSnake(patch));
      query = applyWhere(query, where);
      const { data, error } = await query.select("*");
      if (error) throw new Error(error.message);
      const row = data?.[0];
      return row ? keysToCamel(row) : null;
    },
    async remove(table, id) {
      const { error } = await client.from(toSnake(table)).delete().eq(toSnake(primaryKey(table)), id);
      if (error) throw new Error(error.message);
    },
    async removeWhere(table, where) {
      let query = client.from(toSnake(table)).delete();
      query = applyWhere(query, where);
      const { data, error } = await query.select(toSnake(primaryKey(table)));
      if (error) throw new Error(error.message);
      return data?.length ?? 0;
    },
    transaction(work) {
      return work(repo);
    },
  };
  return repo;
}

function applyWhere<Q extends { eq: (column: string, value: unknown) => Q; is: (column: string, value: null) => Q; in: (column: string, values: readonly unknown[]) => Q }>(query: Q, where?: { eq?: object; in?: object }) {
  if (where?.eq) {
    for (const [key, value] of Object.entries(where.eq)) {
      if (value === undefined) continue;
      query = value === null ? query.is(toSnake(key), null) : query.eq(toSnake(key), value);
    }
  }
  if (where?.in) {
    for (const [key, values] of Object.entries(where.in)) {
      if (Array.isArray(values) && values.length) query = query.in(toSnake(key), values);
    }
  }
  return query;
}
