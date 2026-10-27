import type { Database, Row, TableName } from "@/lib/domain";
import { matches, primaryKey, type Repository } from "@/lib/data/repository";

export function emptyDatabase(): Database {
  return {
    profiles: [],
    credentials: [],
    emailTokens: [],
    couples: [],
    coupleMembers: [],
    coupleInvitations: [],
    reconnectRequests: [],
    questionCategories: [],
    questions: [],
    questionOptions: [],
    quizTemplates: [],
    quizRounds: [],
    quizRoundQuestions: [],
    quizSessions: [],
    userAnswers: [],
    answerPredictions: [],
    answerReveals: [],
    similarityMarks: [],
    scoreSnapshots: [],
    personalityTests: [],
    personalityQuestions: [],
    personalitySessions: [],
    personalityAnswers: [],
    personalityResults: [],
    conversationCards: [],
    savedQuestions: [],
    cardActivity: [],
    sharedReflections: [],
    coupleChallenges: [],
    challengeProgress: [],
    achievements: [],
    userAchievements: [],
    coupleMemories: [],
    memoryAttachments: [],
    notifications: [],
    userPreferences: [],
    reports: [],
    userBlocks: [],
    auditEvents: [],
    loginAttempts: [],
    supportMessages: [],
    mediaObjects: [],
    siteSettings: [],
    cycleProfiles: [],
    cyclePeriods: [],
    cycleCheckIns: [],
    cyclePregnancyLogs: [],
    cycleReminders: [],
    cycleEvents: [],
    cycleShareGrants: [],
    datePlans: [],
    itineraryDays: [],
    itineraryActivities: [],
    itineraryExpenses: [],
    itineraryChecklists: [],
    itineraryComments: [],
    itineraryHistory: [],
  };
}

export function createMemoryRepository(initial?: Database): Repository & { snapshot: () => Database } {
  const db = initial ?? emptyDatabase();

  function rows<T extends TableName>(table: T) {
    return db[table] as Row<T>[];
  }

  const repo: Repository & { snapshot: () => Database } = {
    kind: "memory",
    async list(table, where, options) {
      let list = rows(table).filter((row) => matches(row, where));
      if (options?.orderBy) {
        const key = options.orderBy as keyof (typeof list)[number];
        list = [...list].sort((a, b) => {
          const left = String(a[key] ?? "");
          const right = String(b[key] ?? "");
          return options.descending ? right.localeCompare(left) : left.localeCompare(right);
        });
      }
      if (options?.limit) list = list.slice(0, options.limit);
      return list.map((row) => structuredClone(row));
    },
    async count(table, where) {
      return rows(table).filter((row) => matches(row, where)).length;
    },
    async find(table, where) {
      const found = rows(table).find((row) => matches(row, where));
      return found ? structuredClone(found) : null;
    },
    async insert(table, row) {
      rows(table).push(structuredClone(row));
      return structuredClone(row);
    },
    async update(table, id, patch) {
      const key = primaryKey(table);
      const current = rows(table).find((row) => (row as Record<string, unknown>)[key] === id);
      if (!current) throw new Error(`Missing ${table} row ${id}`);
      Object.assign(current, patch);
      return structuredClone(current);
    },
    async updateWhere(table, where, patch) {
      const current = rows(table).find((row) => matches(row, where));
      if (!current) return null;
      Object.assign(current, patch);
      return structuredClone(current);
    },
    async remove(table, id) {
      const key = primaryKey(table);
      const list = rows(table);
      const index = list.findIndex((row) => (row as Record<string, unknown>)[key] === id);
      if (index >= 0) list.splice(index, 1);
    },
    async removeWhere(table, where) {
      const list = rows(table);
      const keep = list.filter((row) => !matches(row, where));
      const removed = list.length - keep.length;
      (db[table] as Row<TableName>[]) = keep;
      return removed;
    },
    snapshot() {
      return structuredClone(db);
    },
    transaction(work) {
      return work(repo);
    },
  };

  return repo;
}
