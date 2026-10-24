import type {
  Achievement,
  AnswerType,
  ConversationCard,
  CoupleChallenge,
  Difficulty,
  PersonalityQuestion,
  PersonalityTest,
  Question,
  QuestionCategory,
  QuestionConfig,
  QuestionDependency,
  QuestionOption,
  QuizTemplate,
} from "@/lib/domain";

const STAMP = "2026-01-01T00:00:00.000Z";

const categoryDrafts: [string, string, string, boolean][] = [
  ["favorites", "Favorite Things", "The little favorites that make ordinary days feel like theirs.", false],
  ["habits", "Everyday Habits", "Rhythms, energy, and the way a normal day actually goes.", false],
  ["affection", "Love and Affection", "How care feels good when it is offered in the way someone wants.", false],
  ["intimacy", "Intimacy and Closeness", "Optional questions about emotional closeness, affection, and boundaries. Private unless you share them.", true],
  ["scenarios", "Situational Moments", "Everyday what-if questions. Preferences are compared, not graded as right or wrong.", false],
  ["memories", "Memories Together", "The moments you are building a shared story from.", false],
  ["dreams", "Dreams and Goals", "Hopes, curiosities, and the future that sounds like a good life.", false],
  ["personality", "Personality and Behavior", "Tendencies to understand, never a box to put someone in.", false],
  ["communication", "Communication and Repair", "How you like to talk, pause, apologize, and find a way back.", false],
  ["playful", "Fun, Random, and Funny", "Light questions for laughing and noticing the charming details.", false],
  ["deep", "Deep Conversations", "Gentler questions about trust, safety, and feeling understood.", false],
  ["lifestyle", "Future and Lifestyle", "How you like to live, travel, work, and plan. Sensitive items stay optional.", true],
];

export const categories: QuestionCategory[] = categoryDrafts.map(([slug, name, description, sensitive], sortOrder) => ({
  id: slug,
  slug,
  name,
  description,
  sortOrder,
  sensitive: Boolean(sensitive),
}));

type Draft = {
  slug: string;
  category: string;
  self: string;
  guess?: string;
  type: AnswerType;
  difficulty?: Difficulty;
  sensitive?: boolean;
  options?: Array<string | { label: string; value: string; imageUrl?: string }>;
  config?: QuestionConfig;
  dependsOn?: { slug: string; operator: "eq" | "includes"; value: string };
};

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function buildQuestion(draft: Draft, sortOrder: number): { question: Question; options: QuestionOption[] } {
  const dependency: QuestionDependency | null = draft.dependsOn
    ? { questionId: draft.dependsOn.slug, operator: draft.dependsOn.operator, value: draft.dependsOn.value }
    : null;
  const question: Question = {
    id: draft.slug,
    categoryId: draft.category,
    slug: draft.slug,
    selfPrompt: draft.self,
    guessPrompt: draft.guess ?? `How would your partner answer: ${draft.self}`,
    reversePrompt: `What would your partner guess is your answer to: ${draft.self}`,
    answerType: draft.type,
    difficulty: draft.difficulty ?? "easy",
    sensitive: Boolean(draft.sensitive),
    isActive: true,
    isSystem: true,
    visibility: "public",
    coupleId: null,
    createdBy: null,
    scoringRule: draft.type,
    config: draft.config ?? {},
    sortOrder,
    locale: "en",
    dependsOn: dependency,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
  const options = (draft.options ?? []).map((option, index) => {
    const item = typeof option === "string" ? { label: option, value: slugify(option) } : option;
    return {
      id: `${draft.slug}-${item.value}`,
      questionId: draft.slug,
      label: item.label,
      value: item.value,
      imageUrl: item.imageUrl ?? null,
      sortOrder: index + 1,
    };
  });
  return { question, options };
}

const drafts: Draft[] = [
  { slug: "favorite-color", category: "favorites", self: "What is your favorite color?", guess: "What is your partner's favorite color?", type: "single", options: ["Blue", "Green", "Red", "Pink", "Black", "Yellow", "Lavender", "Cream"] },
  { slug: "favorite-food", category: "favorites", self: "What is your favorite food?", guess: "What is your partner's favorite food?", type: "single", options: ["Pasta", "Adobo", "Sushi", "Pizza", "Sinigang", "Tacos", "Rice bowls", "Breakfast food"] },
  { slug: "favorite-drink", category: "favorites", self: "What is your favorite drink?", guess: "What does your partner love to drink?", type: "single", options: ["Iced coffee", "Hot chocolate", "Tea", "Water", "Smoothies", "Soda", "Milk tea"] },
  { slug: "favorite-dessert", category: "favorites", self: "What is your favorite dessert?", guess: "Which dessert would your partner pick?", type: "single", options: ["Mango float", "Ice cream", "Chocolate cake", "Halo-halo", "Cookies", "Fruit", "No strong preference"] },
  { slug: "favorite-movie", category: "favorites", self: "What movie could you happily watch again?", guess: "What movie would your partner watch again?", type: "short_text", difficulty: "medium", config: { placeholder: "A title or the kind of movie", maxLength: 80 } },
  { slug: "favorite-music", category: "favorites", self: "Which artist or band feels most like you lately?", guess: "Which artist would your partner name?", type: "short_text", config: { maxLength: 80 } },
  { slug: "favorite-song", category: "favorites", self: "What song has been stuck with you?", guess: "What song would your partner choose?", type: "short_text", config: { maxLength: 80 } },
  { slug: "favorite-book", category: "favorites", self: "What book, comic, or story do you recommend?", guess: "What would your partner recommend?", type: "short_text", difficulty: "medium", config: { maxLength: 80 } },
  { slug: "favorite-game", category: "favorites", self: "What game do you most enjoy?", guess: "What game does your partner enjoy most?", type: "single", options: ["Video games", "Board games", "Card games", "Sports", "Word games", "No particular game"] },
  { slug: "favorite-place", category: "favorites", self: "Which place feels most like a good day?", guess: "Which place would your partner choose?", type: "image", options: [
    { label: "Beach", value: "beach", imageUrl: "/quiz/beach.svg" },
    { label: "Mountains", value: "mountains", imageUrl: "/quiz/mountains.svg" },
    { label: "City", value: "city", imageUrl: "/quiz/city.svg" },
    { label: "Home", value: "home", imageUrl: "/quiz/home.svg" },
  ] },
  { slug: "favorite-season", category: "favorites", self: "What is your favorite season?", guess: "What season does your partner love?", type: "single", options: ["Rainy season", "Cool dry months", "Hot summer", "A mild spring", "No preference"] },
  { slug: "favorite-animal", category: "favorites", self: "What animal do you feel fondest of?", guess: "What animal would your partner choose?", type: "single", options: ["Cats", "Dogs", "Birds", "Sea creatures", "Something unusual"] },
  { slug: "favorite-scent", category: "favorites", self: "What scent feels comforting?", guess: "What scent comforts your partner?", type: "single", options: ["Coffee", "Rain", "Citrus", "Vanilla", "Clean laundry", "Flowers", "The ocean"] },
  { slug: "favorite-style", category: "favorites", self: "Which clothing style feels most like you?", guess: "How would you describe your partner's style?", type: "single", options: ["Casual", "Soft and romantic", "Simple and classic", "Sporty", "Bold", "Cozy"] },
  { slug: "morning-night", category: "habits", self: "Are you more of a morning person or a night owl?", guess: "Is your partner a morning person or a night owl?", type: "either", options: ["Morning person", "Night owl"] },
  { slug: "social-energy", category: "habits", self: "Where does your social energy usually sit?", guess: "How would your partner describe their social energy?", type: "single", options: ["Introvert", "Extrovert", "Ambivert", "It depends on the week"] },
  { slug: "relax-style", category: "habits", self: "How do you usually like to relax?", guess: "How does your partner usually relax?", type: "single", options: ["A quiet activity", "Food", "A nap", "Seeing people", "Moving my body", "A screen and a blanket"] },
  { slug: "comfort-food", category: "habits", self: "What is your usual comfort food?", guess: "What comfort food would your partner name?", type: "short_text", dependsOn: { slug: "relax-style", operator: "eq", value: "food" }, config: { maxLength: 80 } },
  { slug: "when-tired", category: "habits", self: "How do you usually behave when you are tired?", guess: "What is your partner like when they are tired?", type: "single", difficulty: "medium", options: ["I get quiet", "I get irritable", "I get silly", "I want help deciding things", "I need to be alone for a bit"] },
  { slug: "comfort-habit", category: "habits", self: "What habit helps you feel settled?", guess: "What habit helps your partner feel settled?", type: "single", options: ["Music", "Shower", "Tidying a little", "Messaging someone safe", "Stepping outside", "A familiar show"] },
  { slug: "weekends", category: "habits", self: "How do you prefer to spend a weekend?", guess: "How does your partner prefer weekends?", type: "multi", options: ["Quiet time", "Food", "Seeing friends", "Errands and reset", "Going somewhere", "Staying in bed longer"] },
  { slug: "feel-loved", category: "affection", self: "What helps you feel loved?", guess: "What helps your partner feel loved?", type: "multi", difficulty: "medium", options: ["Words of appreciation", "Quality time", "Thoughtful gestures", "Helpful actions", "Appropriate affection", "Being listened to"] },
  { slug: "affection-receive", category: "affection", self: "How do you most like to receive affection?", guess: "How does your partner like to receive affection?", type: "single", difficulty: "medium", options: ["Words", "Time together", "A small gift or gesture", "Practical help", "Closeness, when it is welcome"] },
  { slug: "small-gesture", category: "affection", self: "What small gesture makes you happy?", guess: "What small gesture makes your partner happiest?", type: "short_text", config: { maxLength: 140 } },
  { slug: "quality-time", category: "affection", self: "What does good quality time look like for you?", guess: "What does quality time look like for your partner?", type: "single", options: ["Talking without rushing", "Doing an activity side by side", "Sharing a meal", "Going out", "Being cozy at home", "Trying something new"] },
  { slug: "surprise", category: "affection", self: "What kind of romantic surprise would you appreciate?", guess: "What surprise would your partner appreciate?", type: "single", options: ["A planned date", "A handwritten note", "A favorite snack", "Time with phones away", "A tiny adventure", "Please ask me first"] },
  { slug: "appreciated", category: "affection", self: "What makes you feel appreciated?", guess: "What makes your partner feel appreciated?", type: "single", difficulty: "medium", options: ["Being thanked specifically", "Someone noticing effort", "Being asked for my opinion", "A check-in text", "Help without being asked"] },
  { slug: "meaningful-date", category: "affection", self: "What does a meaningful date look like to you?", guess: "What would a meaningful date look like to your partner?", type: "long_text", difficulty: "medium", config: { maxLength: 400, placeholder: "A place, a pace, or a feeling" } },
  { slug: "first-meet", category: "memories", self: "Where did you two first meet?", guess: "Where does your partner think you first met?", type: "short_text", difficulty: "medium", config: { maxLength: 120 } },
  { slug: "first-date", category: "memories", self: "What was your first date, in your words?", guess: "How would your partner describe your first date?", type: "short_text", difficulty: "medium", config: { maxLength: 160 } },
  { slug: "first-outfit", category: "memories", self: "What do you remember your partner wearing when you first met?", guess: "What would your partner remember you wearing?", type: "short_text", difficulty: "deep", config: { maxLength: 160 } },
  { slug: "first-memory", category: "memories", self: "What was your first shared memorable experience?", guess: "What shared memory would your partner name first?", type: "long_text", difficulty: "medium", config: { maxLength: 400 } },
  { slug: "closer-moment", category: "memories", self: "What moment made you feel closer?", guess: "What moment does your partner think brought you closer?", type: "long_text", difficulty: "deep", config: { maxLength: 400 } },
  { slug: "favorite-memory", category: "memories", self: "What is your favorite memory of the relationship so far?", guess: "What memory would your partner choose?", type: "long_text", difficulty: "deep", config: { maxLength: 400 } },
  { slug: "met-on", category: "memories", self: "What date did you first meet, if you remember it?", guess: "What date would your partner give for when you met?", type: "date", difficulty: "medium" },
  { slug: "dream-country", category: "dreams", self: "What country would you most like to visit?", guess: "Where does your partner most want to travel?", type: "short_text", config: { maxLength: 80 } },
  { slug: "dream-project", category: "dreams", self: "What dream project or career direction excites you?", guess: "What dream would your partner name?", type: "short_text", difficulty: "medium", config: { maxLength: 140 } },
  { slug: "ideal-future", category: "dreams", self: "What does a good future look like to you right now?", guess: "How would your partner describe a good future?", type: "long_text", difficulty: "deep", config: { maxLength: 500 } },
  { slug: "learn-skill", category: "dreams", self: "What skill would you love to learn?", guess: "What skill would your partner love to learn?", type: "short_text", config: { maxLength: 80 } },
  { slug: "bucket-item", category: "dreams", self: "What is one thing on your bucket list?", guess: "What bucket-list item fits your partner?", type: "short_text", difficulty: "medium", config: { maxLength: 140 } },
  { slug: "happy-life", category: "dreams", self: "What does a happy life mean to you?", guess: "What does a happy life mean to your partner?", type: "long_text", difficulty: "deep", config: { maxLength: 500 } },
  { slug: "decisions", category: "personality", self: "How do you usually make decisions?", guess: "How does your partner usually make decisions?", type: "either", options: ["Talk it through", "Think alone first"] },
  { slug: "planning-style", category: "personality", self: "Do you prefer planning or spontaneity?", guess: "Does your partner prefer planning or spontaneity?", type: "either", options: ["Planning", "Spontaneity"] },
  { slug: "stress-response", category: "personality", self: "How do you usually respond to stress?", guess: "How does your partner respond to stress?", type: "single", difficulty: "medium", options: ["I get quiet", "I want to solve it", "I want comfort", "I need a break", "I talk it out"] },
  { slug: "disagreement-style", category: "personality", self: "How do you prefer to handle a disagreement?", guess: "How does your partner prefer to handle disagreements?", type: "single", difficulty: "deep", options: ["Talk soon", "Take a short break first", "Write it down first", "Focus on the practical fix", "Focus on how it felt"] },
  { slug: "motivation", category: "personality", self: "What motivates you most these days?", guess: "What motivates your partner?", type: "multi", difficulty: "medium", options: ["People I love", "Curiosity", "Making something", "Stability", "Recognition", "Freedom"] },
  { slug: "recharge", category: "personality", self: "What kind of environment helps you recharge?", guess: "Where does your partner recharge?", type: "single", options: ["Quiet home", "Nature", "A busy cafe", "With one person", "Alone with music", "After moving around"] },
  { slug: "fictional-character", category: "playful", self: "Which fictional character feels a little like you?", guess: "Which fictional character resembles your partner?", type: "short_text", config: { maxLength: 80 } },
  { slug: "million-pesos", category: "playful", self: "If you received a million pesos today, what might you do first?", guess: "What might your partner do first with a million pesos?", type: "single", options: ["Share it with family", "Travel", "Save most of it", "A meaningful gift", "A practical upgrade", "A celebration meal"] },
  { slug: "repeat-food", category: "playful", self: "What food could you eat over and over?", guess: "What food could your partner eat repeatedly?", type: "short_text", config: { maxLength: 80 } },
  { slug: "funny-habit", category: "playful", self: "What is a funny habit of yours?", guess: "What is your partner's funniest habit?", type: "short_text", config: { maxLength: 140 } },
  { slug: "superpower", category: "playful", self: "Which superpower would you choose?", guess: "Which superpower would your partner choose?", type: "single", options: ["Flying", "Time travel", "Invisibility", "Healing", "Speaking every language", "Endless good sleep"] },
  { slug: "desert-island", category: "playful", self: "What would you bring to a deserted island?", guess: "What would your partner bring?", type: "multi", options: ["Music", "A book", "Tools", "Snacks", "A photo", "Something to write with"] },
  { slug: "fictional-universe", category: "playful", self: "Which kind of fictional universe would you visit?", guess: "Which universe would your partner visit?", type: "single", options: ["Cozy fantasy", "Space adventure", "Studio Ghibli-like", "A detective story", "A rom-com world", "A quiet historical village"] },
  { slug: "emoji-today", category: "playful", self: "Which emoji fits your week?", guess: "Which emoji fits your partner's week?", type: "emoji", options: [
    { label: "😌 Calm", value: "calm" },
    { label: "🤩 Excited", value: "excited" },
    { label: "🥰 Tender", value: "tender" },
    { label: "😴 Tired", value: "tired" },
    { label: "🥹 Proud", value: "proud" },
  ] },
  { slug: "emotionally-safe", category: "deep", self: "What helps you feel emotionally safe?", guess: "What helps your partner feel emotionally safe?", type: "long_text", difficulty: "deep", config: { maxLength: 500 } },
  { slug: "trust-means", category: "deep", self: "What does trust mean to you?", guess: "What does trust mean to your partner?", type: "long_text", difficulty: "deep", config: { maxLength: 500 } },
  { slug: "proud-of", category: "deep", self: "What is something you are proud of?", guess: "What might your partner be proud of?", type: "short_text", difficulty: "medium", config: { maxLength: 160 } },
  { slug: "feel-understood", category: "deep", self: "What helps you feel understood?", guess: "What helps your partner feel understood?", type: "long_text", difficulty: "deep", config: { maxLength: 400 } },
  { slug: "hard-day-support", category: "deep", self: "What kind of support do you want on a difficult day?", guess: "What support does your partner appreciate on a hard day?", type: "single", difficulty: "deep", options: ["Listening without fixing", "Practical help", "Company in silence", "A distraction", "Reassurance", "Space, then a check-in"] },
  { slug: "understand-better", category: "deep", self: "What do you want your partner to understand better about you?", guess: "What might your partner want you to understand?", type: "long_text", difficulty: "deep", sensitive: true, config: { maxLength: 500 } },
  { slug: "living-environment", category: "lifestyle", self: "What living environment sounds ideal?", guess: "What living environment would your partner choose?", type: "single", options: ["A quiet neighborhood", "A walkable city", "Near water", "Near family", "Somewhere new", "I am still deciding"] },
  { slug: "travel-style", category: "lifestyle", self: "What is your preferred travel style?", guess: "How does your partner like to travel?", type: "either", options: ["Loose plans", "Detailed itinerary"] },
  { slug: "money-style", category: "lifestyle", self: "How do you like to think about saving and spending? You can skip this.", guess: "How might your partner describe their money style? Skip if you would rather not guess.", type: "single", difficulty: "deep", sensitive: true, options: ["Save first", "Spend on experiences", "A careful balance", "I would rather not say"] },
  { slug: "work-life", category: "lifestyle", self: "How important is a firm boundary around work time right now?", guess: "How important is that boundary for your partner?", type: "scale", difficulty: "medium", config: { scaleMin: 1, scaleMax: 5, scaleLabels: ["Very flexible", "Firm boundary"] } },
  { slug: "ideal-weekend-routine", category: "lifestyle", self: "What belongs in an ideal weekend?", guess: "What belongs in your partner's ideal weekend?", type: "multi", options: ["Slow morning", "Good food", "Movement", "Friends", "A project", "Rest with no plan"] },
  { slug: "future-planning", category: "lifestyle", self: "How do you like to approach future plans?", guess: "How does your partner like to plan the future?", type: "either", options: ["Talk about it early", "Decide when it feels real"] },
  { slug: "date-ranking", category: "affection", self: "Rank these date ingredients from most to least you.", guess: "How would your partner rank these?", type: "ranking", difficulty: "medium", options: ["Cooking together", "A long walk", "A movie", "A surprise plan"] },
  { slug: "stay-in", category: "habits", self: "Would you rather stay in than go out tonight?", guess: "Would your partner rather stay in tonight?", type: "yesno", options: ["Yes", "No"] },
  { slug: "voice-note", category: "memories", self: "Optional: leave a short voice note about a song, place, or moment. You can type a caption too.", guess: "Optional: what would your partner say in a voice note?", type: "voice", difficulty: "medium", config: { maxLength: 140, placeholder: "A short caption" } },
  { slug: "favorite-hobby", category: "favorites", self: "What hobby would you happily spend a free hour on?", guess: "What hobby would your partner pick for a free hour?", type: "single", options: ["Cooking", "Music", "Games", "Reading", "Moving around", "Making something", "A nap"] },
  { slug: "favorite-gift", category: "favorites", self: "What kind of gift feels most thoughtful to you?", guess: "What gift would your partner appreciate most?", type: "single", options: ["Something useful", "A favorite snack", "Time together", "A handwritten note", "An experience", "Please ask me first"] },
  { slug: "free-time", category: "favorites", self: "How do you most like to spend free time?", guess: "How does your partner like to spend free time?", type: "single", options: ["At home", "Out with one person", "With a group", "Outside", "Learning something", "Doing nothing on purpose"] },
  { slug: "dream-destination", category: "dreams", self: "Which kind of destination is calling you?", guess: "Which destination would your partner choose?", type: "single", options: ["A quiet beach", "A city to walk", "Mountains", "Somewhere with family", "A place neither of you has been", "Home, with a good plan"] },
  { slug: "work-balance", category: "dreams", self: "What does a good work-life balance look like for you right now?", guess: "What balance would your partner describe?", type: "single", difficulty: "medium", options: ["Clear evenings off", "Flexible days", "A busy season, then rest", "Work I can leave at the door", "I am still figuring it out"] },
  { slug: "shared-goal", category: "dreams", self: "What shared goal would you like to name, even if it stays unfinished?", guess: "What shared goal might your partner name?", type: "short_text", difficulty: "medium", config: { maxLength: 140 } },
  { slug: "cool-down", category: "communication", self: "When a conversation gets tense, what helps you cool down?", guess: "What helps your partner cool down before talking?", type: "single", difficulty: "medium", options: ["A short pause", "A walk", "Writing it first", "Staying and talking slowly", "Reassurance that we are on the same team"] },
  { slug: "apology", category: "communication", self: "What makes an apology feel meaningful to you?", guess: "What makes an apology feel meaningful to your partner?", type: "single", difficulty: "deep", options: ["Naming what happened", "Hearing what will change", "A check-in later", "Repair through action", "Time before more words"] },
  { slug: "reassurance-style", category: "communication", self: "How do you prefer to receive reassurance?", guess: "How does your partner prefer reassurance?", type: "single", options: ["A clear sentence", "A small helpful action", "Company without a speech", "A later check-in", "I usually do not need much"] },
  { slug: "compromise", category: "communication", self: "How do you like to approach a compromise?", guess: "How would your partner approach a compromise?", type: "single", difficulty: "medium", options: ["Name what matters most", "Trade turns", "Look for a third option", "Pause and return", "Decide the small thing and leave the big one"] },
  { slug: "boundary-talk", category: "communication", self: "How do you prefer to tell someone a boundary?", guess: "How would your partner rather hear a boundary?", type: "single", difficulty: "deep", options: ["Direct and kind", "In writing first", "With an example", "After some warmth", "Only when I feel safe"] },
  { slug: "scenario-hard-day", category: "scenarios", self: "After a stressful day, what kind of support do you want first?", guess: "After a stressful day, what support would your partner want first?", type: "single", difficulty: "medium", options: ["Listening", "Practical help", "Quiet company", "A distraction", "Space, then a check-in"] },
  { slug: "scenario-weekend", category: "scenarios", self: "If you disagree about weekend plans, how do you want to approach it?", guess: "How would your partner approach a weekend disagreement?", type: "single", difficulty: "medium", options: ["Talk it through tonight", "Each name one priority", "Take a short pause", "Pick the smaller plan", "Leave it and choose later"] },
  { slug: "scenario-good-news", category: "scenarios", self: "When you get unexpected good news, how do you want to celebrate?", guess: "How would your partner want to celebrate good news?", type: "single", options: ["Tell them immediately", "A small meal", "A quiet happy hour", "Make a plan", "Keep it low-key"] },
  { slug: "scenario-surprise", category: "scenarios", self: "If someone planned a surprise date for you, what would you appreciate most?", guess: "What would your partner appreciate most in a surprise date?", type: "single", options: ["A favorite food", "Somewhere familiar", "A new place", "Time with phones away", "Being asked before the surprise"] },
  { slug: "scenario-space", category: "scenarios", self: "When you need personal space, how do you want the other person to respond?", guess: "When your partner needs space, how would they prefer you respond?", type: "single", difficulty: "medium", options: ["A kind okay, then quiet", "A time to check back in", "Company in another room", "A short message later", "Ask once, then wait"] },
  { slug: "scenario-future", category: "scenarios", self: "If you disagree about a future plan, how do you want to discuss it?", guess: "How would your partner prefer to discuss a future disagreement?", type: "single", difficulty: "deep", options: ["One topic at a time", "Write the options down", "Talk after a pause", "Start with what you both want", "Leave it until it is real"] },
  { slug: "scenario-misunderstood", category: "scenarios", self: "When you feel misunderstood, what helps you feel heard?", guess: "What would help your partner feel heard?", type: "single", difficulty: "deep", options: ["Repeat back what you heard", "Ask a follow-up", "Slow down", "Acknowledge the feeling first", "Try again later"] },
  { slug: "scenario-plans-change", category: "scenarios", self: "When plans suddenly change, how do you usually react?", guess: "How would your partner react when plans change?", type: "single", options: ["I adapt quickly", "I need a minute", "I want a new plan", "I feel disappointed, then adjust", "I would rather cancel than rush"] },
  { slug: "merienda", category: "playful", self: "Which merienda would you pick at 3 p.m.?", guess: "Which merienda would your partner pick?", type: "single", options: ["Banana cue", "Turon", "Pandesal and coffee", "Halo-halo", "Fruit", "Whatever is already at home"] },
  { slug: "brownout", category: "playful", self: "If the power goes out, what do you do first?", guess: "What would your partner do first in a brownout?", type: "single", options: ["Find a light", "Text someone", "Sit and wait", "Go outside", "Turn it into a story"] },
  { slug: "commute", category: "playful", self: "Jeepney, ride-hailing, or walking?", guess: "What would your partner choose?", type: "single", options: ["Jeepney", "Ride-hailing", "Walking", "Whichever is less crowded"] },
  { slug: "would-rather-rain", category: "playful", self: "Would you rather be caught in the rain or wait it out?", guess: "Would your partner rather get rained on or wait?", type: "either", options: ["Walk in the rain", "Wait it out"] },
  { slug: "close-feeling", category: "intimacy", self: "What helps you feel emotionally close? You can skip this.", guess: "What might help your partner feel emotionally close? Skip if you would rather not guess.", type: "single", difficulty: "deep", sensitive: true, options: ["Unhurried talk", "Quiet time nearby", "A shared routine", "Being asked what I need", "Affection I can decline"] },
  { slug: "affection-level", category: "intimacy", self: "How much affection feels comfortable on an ordinary day? You can skip this.", guess: "How much affection might your partner want on an ordinary day?", type: "scale", difficulty: "deep", sensitive: true, config: { scaleMin: 1, scaleMax: 5, scaleLabels: ["A little", "A lot, if welcome"] } },
  { slug: "holding-hands", category: "intimacy", self: "How do you feel about holding hands? You can skip this.", guess: "How might your partner feel about holding hands?", type: "single", difficulty: "medium", sensitive: true, options: ["I like it", "Sometimes", "Only in private", "Not really", "I would rather say later"] },
  { slug: "cuddling", category: "intimacy", self: "How do you feel about cuddling? You can skip this.", guess: "How might your partner feel about cuddling?", type: "single", difficulty: "deep", sensitive: true, options: ["Welcome", "For a little while", "Only when I ask", "Not my favorite", "I would rather not answer"] },
  { slug: "need-words", category: "intimacy", self: "How do you prefer to say what you need? You can skip this.", guess: "How might your partner prefer to say what they need?", type: "single", difficulty: "deep", sensitive: true, options: ["Out loud and kindly", "In a message", "With an example", "After I have had time", "Only when I feel safe"] },
  { slug: "feel-safe", category: "intimacy", self: "What helps you feel safe and respected? You can skip this.", guess: "What might help your partner feel safe and respected?", type: "single", difficulty: "deep", sensitive: true, options: ["Being believed", "No pressure to answer", "A pause when I ask", "Checking before affection", "Keeping some things private"] },
  { slug: "sensitive-talk", category: "intimacy", self: "How do you prefer to discuss a sensitive topic? You can skip this.", guess: "How might your partner prefer a sensitive conversation?", type: "single", difficulty: "deep", sensitive: true, options: ["A planned time", "Slowly, one piece at a time", "In writing first", "With the option to stop", "Not until I bring it up"] },
  { slug: "comfort-no", category: "intimacy", self: "How do you want to say when something does not feel comfortable? You can skip this.", guess: "How might your partner say that something does not feel comfortable?", type: "single", difficulty: "deep", sensitive: true, options: ["A direct no", "A softer stop", "A signal we agreed on", "Changing the subject", "I need time before I can say it"] },
  { slug: "repair-closeness", category: "intimacy", self: "What helps closeness after a misunderstanding? You can skip this.", guess: "What might help your partner feel close again after a misunderstanding?", type: "single", difficulty: "deep", sensitive: true, options: ["An apology that names it", "Time, then a check-in", "A small kind action", "Hearing my side fully", "Leaving it until I am ready"] },
];

const built = drafts.map((draft, index) => buildQuestion(draft, index + 1));

export const questions: Question[] = built.map((item) => item.question);
export const questionOptions: QuestionOption[] = built.flatMap((item) => item.options);

const templateDrafts: [string, string, string, QuizTemplate["mode"], number][] = [
  ["partner-guess", "Partner guess", "Guess answers your partner has already shared.", "guess", 10],
  ["reveal", "Answer together", "Both of you answer privately, then open the results together.", "reveal", 10],
  ["quick", "Quick quiz", "Five questions, your answer and your guess.", "exchange", 5],
  ["standard", "Standard quiz", "Ten questions across the categories you choose.", "exchange", 10],
  ["deep-dive", "Deep dive", "Twenty questions for a longer conversation.", "exchange", 20],
  ["daily", "Daily quiz", "Five questions for today. The set resets at midnight Philippine Time.", "daily", 5],
  ["solo", "Solo practice", "Practice guessing. Share the round only if you want to.", "solo", 5],
  ["reverse", "Reverse quiz", "Guess how your partner thinks you would answer.", "reverse", 5],
  ["memory-lane", "Memory lane", "Questions about the story you share.", "exchange", 6],
];

export const quizTemplates: QuizTemplate[] = templateDrafts.map(([slug, name, description, mode, questionCount], sortOrder) => ({
  id: slug,
  slug,
  name,
  description,
  mode,
  questionCount,
  sortOrder,
}));

const achievementDrafts: [string, string, string, number][] = [
  ["first-quiz", "First Quiz Completed", "You finished a quiz of your own.", 15],
  ["first-perfect", "First Perfect Match", "One guess lined up exactly.", 10],
  ["ten-learned", "Ten New Things Learned", "Ten guesses became something new to understand.", 25],
  ["first-personality-comparison", "First Personality Comparison", "You both chose to share a reflection.", 20],
  ["seven-day-streak", "Seven-Day Discovery Streak", "You showed up for seven daily questions.", 20],
  ["deep-conversation", "Completed a Deep Conversation", "You marked a deeper conversation card as discussed.", 15],
  ["five-shared-interests", "Discovered Five Shared Interests", "Five of your own answers matched.", 20],
];

export const achievements: Achievement[] = achievementDrafts.map(([slug, name, description, points]) => ({ id: slug, slug, name, description, points }));

const challengeDrafts: [string, string, string, CoupleChallenge["cadence"], number][] = [
  ["daily-question", "Answer today's question", "One question is enough for today.", "daily", 5],
  ["weekly-discovery", "Weekly discovery", "Finish one quiz together this week.", "weekly", 15],
  ["guess-round", "Guess with care", "Play a partner-guess quiz.", "weekly", 15],
  ["memory-challenge", "Add a memory", "Save one moment on your private timeline.", "weekly", 10],
  ["interest-challenge", "Name a shared interest", "Notice one thing you both enjoy.", "weekly", 10],
  ["personality-challenge", "Take a reflection", "Complete one personality reflection.", "once", 25],
  ["appreciation-challenge", "Leave an appreciation", "Write a shared reflection or a kind memory.", "weekly", 10],
  ["bucket-challenge", "Bucket-list seed", "Answer the bucket-list question or add a future plan.", "once", 10],
];

export const challenges: CoupleChallenge[] = challengeDrafts.map(([slug, title, description, cadence, points]) => ({
  id: slug,
  slug,
  title,
  description,
  cadence,
  points,
  isActive: true,
}));

const cardDrafts: Array<[string, string, string]> = [
  ["light", "playful", "If we had a free afternoon and no errands, what should we do first?"],
  ["light", "playful", "What is a tiny thing I do that you hope I never stop?"],
  ["light", "everyday", "What snack should always be in our kitchen?"],
  ["everyday", "everyday", "What does a good ordinary Tuesday look like for you?"],
  ["everyday", "everyday", "When you need a reset, do you want company or space first?"],
  ["everyday", "everyday", "What household task do you secretly not mind?"],
  ["romance", "tender", "What is a small way I can show you care this week?"],
  ["romance", "tender", "What kind of date feels romantic without needing to be expensive?"],
  ["romance", "tender", "Which compliment stays with you longer than I might expect?"],
  ["memories", "nostalgic", "What is a moment with us you can picture clearly?"],
  ["memories", "nostalgic", "What song or place brings you back to an early day together?"],
  ["memories", "nostalgic", "What is something we have already figured out as a pair?"],
  ["dreams", "hopeful", "What is something you want to be brave about this year?"],
  ["dreams", "hopeful", "If we planned a trip with no audience, where would we go?"],
  ["dreams", "hopeful", "What would you like our life to feel like on a random Sunday?"],
  ["emotional", "gentle", "What helps you feel on the same team during a hard week?"],
  ["emotional", "gentle", "What does feeling understood look like in a conversation?"],
  ["emotional", "gentle", "Is there a story about yourself you want me to hold more carefully?"],
  ["communication", "curious", "Do you like to talk things through right away, or after a pause?"],
  ["communication", "curious", "What is a phrase that helps you feel less defensive?"],
  ["communication", "curious", "How can I tell when you want advice, and when you want listening?"],
  ["growth", "hopeful", "What are you learning about yourself lately?"],
  ["growth", "hopeful", "What is a habit you are proud of building?"],
  ["growth", "hopeful", "Where would you like a little more patience from me?"],
  ["future", "hopeful", "What is a plan we can leave unfinished until we are both ready?"],
  ["future", "hopeful", "What tradition would you like us to invent?"],
  ["future", "hopeful", "What does support look like if one of us is chasing a big goal?"],
  ["sensitive", "careful", "Is there a topic you want to postpone until you feel ready?"],
  ["sensitive", "careful", "What boundary helps you stay open rather than overwhelmed?"],
  ["sensitive", "careful", "What kind of reassurance is welcome, and what kind feels like pressure?"],
];

export const conversationCards: ConversationCard[] = cardDrafts.map(([depth, mood, prompt], index) => ({
  id: `card-${index + 1}`,
  slug: `card-${index + 1}`,
  prompt,
  depth,
  mood,
  topic: depth,
  sensitive: depth === "sensitive",
  isSystem: true,
  coupleId: null,
  createdBy: null,
  isActive: true,
  locale: "en",
}));

export const personalityTests: PersonalityTest[] = [
  {
    id: "style",
    slug: "style",
    name: "Personality style",
    description: "A descriptive look at energy, planning, decisions, imagination, and how you like to talk.",
    disclaimer: "These are self-reflection prompts, not a personality diagnosis or a label you have to fit.",
    sortOrder: 1,
    isActive: true,
  },
  {
    id: "love",
    slug: "love",
    name: "Love and affection preferences",
    description: "Notice the ways appreciation, time, gestures, help, and closeness matter to you. More than one can be true.",
    disclaimer: "This is not a fixed love-language type. People can want different kinds of care on different days.",
    sortOrder: 2,
    isActive: true,
  },
  {
    id: "communication",
    slug: "communication",
    name: "Communication style",
    description: "How you like to start hard talks, take time, and offer support.",
    disclaimer: "A preference is not a flaw. It is information you can share if you want to.",
    sortOrder: 3,
    isActive: true,
  },
  {
    id: "conflict",
    slug: "conflict",
    name: "Conflict and repair",
    description: "What helps you calm down, talk, apologize, and find your way back.",
    disclaimer: "These results do not diagnose anyone or describe a person as toxic, avoidant, or disordered.",
    sortOrder: 4,
    isActive: true,
  },
  {
    id: "needs",
    slug: "needs",
    name: "Needs and boundaries",
    description: "Optional questions about space, privacy, reassurance, and decisions. Answers stay private until you share them.",
    disclaimer: "You can skip anything. Sharing is a separate choice after you see your own result.",
    sortOrder: 5,
    isActive: true,
  },
];

function scaleQuestion(testId: string, slug: string, prompt: string, dimension: string, reverse = false, sortOrder = 1): PersonalityQuestion {
  return {
    id: `${testId}-${slug}`,
    testId,
    prompt,
    helpText: "1 is not really me, 5 is very much me. Skip if you are not sure.",
    dimension,
    reverse,
    answerType: "scale",
    options: [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) })),
    sortOrder,
    sensitive: testId === "needs",
  };
}

export const personalityQuestions: PersonalityQuestion[] = [
  scaleQuestion("style", "social", "Time with people gives me energy more often than it drains me.", "social", false, 1),
  scaleQuestion("style", "plan", "I feel better when a plan is already in place.", "planning", false, 2),
  scaleQuestion("style", "decide", "I like to compare practical details before I choose.", "decisions", false, 3),
  scaleQuestion("style", "imagine", "I am drawn to imaginative ideas as much as practical ones.", "imagination", false, 4),
  scaleQuestion("style", "talk", "I like to say what I feel while the conversation is happening.", "communication", false, 5),
  scaleQuestion("style", "alone", "I need quiet time before I can enjoy being social again.", "social", true, 6),
  {
    id: "love-channels",
    testId: "love",
    prompt: "Which kinds of care feel especially good to receive? Choose every one that fits.",
    helpText: "There is no correct number of answers.",
    dimension: "channels",
    reverse: false,
    answerType: "multi",
    options: [
      { value: "words", label: "Words of appreciation", dimension: "words" },
      { value: "time", label: "Quality time", dimension: "time" },
      { value: "gestures", label: "Thoughtful gestures", dimension: "gestures" },
      { value: "help", label: "Helpful actions", dimension: "help" },
      { value: "closeness", label: "Appropriate physical affection", dimension: "closeness" },
    ],
    sortOrder: 1,
    sensitive: false,
  },
  scaleQuestion("love", "words", "Specific words of appreciation stay with me.", "words", false, 2),
  scaleQuestion("love", "time", "Unhurried time together matters more to me than a perfect plan.", "time", false, 3),
  scaleQuestion("love", "help", "Practical help can feel as loving as a romantic gesture.", "help", false, 4),
  scaleQuestion("communication", "direct", "I prefer people to say the point directly and kindly.", "direct", false, 1),
  scaleQuestion("communication", "pause", "I like a little time to think before I answer something important.", "pause", false, 2),
  scaleQuestion("communication", "reassure", "Verbal reassurance helps me more than a practical fix.", "reassurance", false, 3),
  scaleQuestion("communication", "listen", "I want emotional listening before problem-solving.", "listening", false, 4),
  scaleQuestion("conflict", "soon", "I usually want to talk about a disagreement sooner rather than later.", "timing", false, 1),
  scaleQuestion("conflict", "break", "A short break helps me come back to a conversation more kindly.", "pause", false, 2),
  scaleQuestion("conflict", "apology", "A meaningful apology names what happened and what will change.", "repair", false, 3),
  scaleQuestion("conflict", "trust", "Trust rebuilds for me through consistent follow-through.", "trust", false, 4),
  scaleQuestion("needs", "space", "I need some personal space even in a close relationship.", "space", false, 1),
  scaleQuestion("needs", "privacy", "Some thoughts are private until I decide to share them.", "privacy", false, 2),
  scaleQuestion("needs", "reassurance", "Occasional reassurance helps me feel steady.", "reassurance", false, 3),
  scaleQuestion("needs", "decisions", "I want important decisions to be made together.", "sharedDecisions", false, 4),
];

export const interests = ["Food", "Music", "Movies", "Travel", "Games", "Reading", "Outdoors", "Cooking", "Art", "Fitness", "Quiet nights", "Cafes"];
