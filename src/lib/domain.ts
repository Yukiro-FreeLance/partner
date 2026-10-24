export const ANSWER_TYPES = [
  "single",
  "multi",
  "boolean",
  "yesno",
  "scale",
  "emoji",
  "ranking",
  "either",
  "short_text",
  "long_text",
  "date",
  "image",
  "voice",
] as const;

export type AnswerType = (typeof ANSWER_TYPES)[number];

export type Difficulty = "easy" | "medium" | "deep";

export type QuizMode = "guess" | "reveal" | "solo" | "reverse" | "daily" | "exchange";

export type AnswerPayload = {
  choice?: string;
  choices?: string[];
  scale?: number;
  ranking?: string[];
  text?: string;
  date?: string;
  mediaId?: string;
  shareWithPartner?: boolean;
};

export type SimilarityValue = "similar" | "partial" | "different";

export type QuestionConfig = {
  scaleMin?: number;
  scaleMax?: number;
  scaleLabels?: [string, string];
  placeholder?: string;
  maxLength?: number;
};

export type QuestionDependency = {
  questionId: string;
  operator: "eq" | "includes";
  value: string;
};

export type Profile = {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  relationshipStatus: string | null;
  relationshipStartedOn: string | null;
  interests: string[];
  preferredCategories: string[];
  role: "user" | "admin" | "super_admin";
  isDemo: boolean;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Credential = {
  userId: string;
  passwordHash: string;
};

export type EmailToken = {
  id: string;
  userId: string;
  purpose: "verify" | "reset";
  tokenHash: string;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
};

export type Couple = {
  id: string;
  name: string;
  nickname: string | null;
  createdBy: string;
  status: "active" | "archived";
  relationshipStartedOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CoupleMember = {
  id: string;
  coupleId: string;
  userId: string;
  status: "active" | "left";
  joinedAt: string;
  leftAt: string | null;
};

export type CoupleInvitation = {
  id: string;
  coupleId: string;
  code: string;
  token: string;
  createdBy: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  expiresAt: string;
  acceptedBy: string | null;
  acceptedAt: string | null;
  createdAt: string;
};

export type ReconnectRequest = {
  id: string;
  coupleId: string;
  requesterId: string;
  partnerId: string;
  status: "pending" | "approved" | "declined" | "cancelled";
  createdAt: string;
  resolvedAt: string | null;
};

export type QuestionCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
  sensitive: boolean;
};

export type Question = {
  id: string;
  categoryId: string;
  slug: string;
  selfPrompt: string;
  guessPrompt: string;
  reversePrompt: string;
  answerType: AnswerType;
  difficulty: Difficulty;
  sensitive: boolean;
  isActive: boolean;
  isSystem: boolean;
  visibility: "public" | "couple" | "private";
  coupleId: string | null;
  createdBy: string | null;
  scoringRule: string;
  config: QuestionConfig;
  sortOrder: number;
  locale: string;
  dependsOn: QuestionDependency | null;
  createdAt: string;
  updatedAt: string;
};

export type QuestionOption = {
  id: string;
  questionId: string;
  label: string;
  value: string;
  imageUrl: string | null;
  sortOrder: number;
};

export type QuizTemplate = {
  id: string;
  slug: string;
  name: string;
  description: string;
  mode: QuizMode;
  questionCount: number;
  sortOrder: number;
};

export type QuizRound = {
  id: string;
  coupleId: string;
  createdBy: string;
  mode: QuizMode;
  title: string;
  status: "active" | "complete";
  size: number;
  categories: string[];
  difficulty: Difficulty | "mixed";
  timerSeconds: number | null;
  includeSensitive: boolean;
  resultsShared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type QuizRoundQuestion = {
  id: string;
  roundId: string;
  questionId: string;
  position: number;
};

export type QuizSession = {
  id: string;
  roundId: string;
  userId: string;
  status: "in_progress" | "completed";
  currentIndex: number;
  startedAt: string;
  completedAt: string | null;
  updatedAt: string;
};

export type UserAnswer = {
  id: string;
  userId: string;
  coupleId: string;
  questionId: string;
  roundId: string | null;
  payload: AnswerPayload;
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AnswerPrediction = {
  id: string;
  predictorId: string;
  subjectId: string;
  coupleId: string;
  questionId: string;
  roundId: string;
  kind: "partner" | "reverse";
  payload: AnswerPayload;
  skipped: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AnswerReveal = {
  id: string;
  coupleId: string;
  questionId: string;
  ownerId: string;
  viewerId: string;
  roundId: string;
  createdAt: string;
};

export type SimilarityMark = {
  id: string;
  coupleId: string;
  questionId: string;
  userId: string;
  mark: SimilarityValue;
  updatedAt: string;
};

export type ScoreSnapshot = {
  id: string;
  coupleId: string;
  roundId: string | null;
  userId: string | null;
  score: number | null;
  correct: number;
  close: number;
  incorrect: number;
  skipped: number;
  eligible: number;
  points: number;
  createdAt: string;
};

export type PersonalityTest = {
  id: string;
  slug: string;
  name: string;
  description: string;
  disclaimer: string;
  sortOrder: number;
  isActive: boolean;
};

export type PersonalityQuestion = {
  id: string;
  testId: string;
  prompt: string;
  helpText: string | null;
  dimension: string;
  reverse: boolean;
  answerType: "scale" | "single" | "multi";
  options: { value: string; label: string; weight?: number; dimension?: string }[];
  sortOrder: number;
  sensitive: boolean;
};

export type PersonalitySession = {
  id: string;
  testId: string;
  userId: string;
  coupleId: string | null;
  status: "in_progress" | "completed";
  currentIndex: number;
  startedAt: string;
  completedAt: string | null;
};

export type PersonalityAnswer = {
  id: string;
  sessionId: string;
  questionId: string;
  userId: string;
  payload: AnswerPayload;
  skipped: boolean;
  updatedAt: string;
};

export type PersonalityResult = {
  id: string;
  sessionId: string;
  testId: string;
  userId: string;
  coupleId: string | null;
  scores: Record<string, number>;
  summary: string;
  suggestions: string[];
  shared: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ConversationCard = {
  id: string;
  slug: string;
  prompt: string;
  depth: string;
  mood: string;
  topic: string;
  sensitive: boolean;
  isSystem: boolean;
  coupleId: string | null;
  createdBy: string | null;
  isActive: boolean;
  locale: string;
};

export type SavedQuestion = {
  id: string;
  userId: string;
  cardId: string | null;
  questionId: string | null;
  createdAt: string;
};

export type CardActivity = {
  id: string;
  userId: string;
  coupleId: string | null;
  cardId: string;
  answered: boolean;
  hidden: boolean;
  note: string | null;
  updatedAt: string;
};

export type SharedReflection = {
  id: string;
  coupleId: string;
  cardId: string | null;
  questionId: string | null;
  authorId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export type CoupleChallenge = {
  id: string;
  slug: string;
  title: string;
  description: string;
  cadence: "daily" | "weekly" | "once";
  points: number;
  isActive: boolean;
};

export type ChallengeProgress = {
  id: string;
  challengeId: string;
  coupleId: string;
  userId: string;
  periodKey: string;
  status: "active" | "completed" | "skipped";
  completedAt: string | null;
  createdAt: string;
};

export type Achievement = {
  id: string;
  slug: string;
  name: string;
  description: string;
  points: number;
};

export type UserAchievement = {
  id: string;
  userId: string;
  achievementId: string;
  coupleId: string | null;
  earnedAt: string;
};

export type CoupleMemory = {
  id: string;
  coupleId: string;
  authorId: string;
  title: string;
  body: string | null;
  kind: "milestone" | "trip" | "moment" | "plan" | "note";
  occurredOn: string | null;
  visibility: "shared" | "private";
  remindOn: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MemoryAttachment = {
  id: string;
  memoryId: string;
  coupleId: string;
  ownerId: string;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
  createdAt: string;
};

export type AppNotification = {
  id: string;
  userId: string;
  coupleId: string | null;
  type: string;
  title: string;
  body: string;
  href: string | null;
  readAt: string | null;
  createdAt: string;
};

export type UserPreferences = {
  userId: string;
  theme: "light" | "dark" | "system";
  locale: "en" | "fil";
  emailNotifications: boolean;
  inAppNotifications: boolean;
  reminderHour: number | null;
  streakPaused: boolean;
  reducedMotion: boolean;
  dailyStreak: number;
  lastDailyOn: string | null;
  points: number;
  recentCardIds: string[];
  onboardingStep: string;
  onboardingCompleted: boolean;
};

export type Report = {
  id: string;
  reporterId: string;
  targetType: "user" | "question" | "memory" | "card";
  targetId: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "dismissed";
  createdAt: string;
};

export type UserBlock = {
  id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
};

export type AuditEvent = {
  id: string;
  userId: string | null;
  action: string;
  coupleId: string | null;
  createdAt: string;
};

export type LoginAttempt = {
  id: string;
  key: string;
  createdAt: string;
};

export type SupportMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

export type MediaObject = {
  id: string;
  ownerId: string;
  coupleId: string | null;
  fileName: string;
  contentType: string;
  size: number;
  storagePath: string;
  createdAt: string;
};

export type Database = {
  profiles: Profile[];
  credentials: Credential[];
  emailTokens: EmailToken[];
  couples: Couple[];
  coupleMembers: CoupleMember[];
  coupleInvitations: CoupleInvitation[];
  reconnectRequests: ReconnectRequest[];
  questionCategories: QuestionCategory[];
  questions: Question[];
  questionOptions: QuestionOption[];
  quizTemplates: QuizTemplate[];
  quizRounds: QuizRound[];
  quizRoundQuestions: QuizRoundQuestion[];
  quizSessions: QuizSession[];
  userAnswers: UserAnswer[];
  answerPredictions: AnswerPrediction[];
  answerReveals: AnswerReveal[];
  similarityMarks: SimilarityMark[];
  scoreSnapshots: ScoreSnapshot[];
  personalityTests: PersonalityTest[];
  personalityQuestions: PersonalityQuestion[];
  personalitySessions: PersonalitySession[];
  personalityAnswers: PersonalityAnswer[];
  personalityResults: PersonalityResult[];
  conversationCards: ConversationCard[];
  savedQuestions: SavedQuestion[];
  cardActivity: CardActivity[];
  sharedReflections: SharedReflection[];
  coupleChallenges: CoupleChallenge[];
  challengeProgress: ChallengeProgress[];
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  coupleMemories: CoupleMemory[];
  memoryAttachments: MemoryAttachment[];
  notifications: AppNotification[];
  userPreferences: UserPreferences[];
  reports: Report[];
  userBlocks: UserBlock[];
  auditEvents: AuditEvent[];
  loginAttempts: LoginAttempt[];
  supportMessages: SupportMessage[];
  mediaObjects: MediaObject[];
};

export type TableName = keyof Database;
export type Row<T extends TableName> = Database[T][number];

export type PublicProfile = Pick<
  Profile,
  | "id"
  | "displayName"
  | "avatarUrl"
  | "bannerUrl"
  | "relationshipStatus"
  | "relationshipStartedOn"
  | "interests"
  | "preferredCategories"
  | "isDemo"
>;
