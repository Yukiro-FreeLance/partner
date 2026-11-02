export type ArcadeGame = {
  slug: string;
  title: string;
  short: string;
  genre: string;
  difficulty: "Easy" | "Medium" | "Hard" | "Expert";
  emoji: string;
  minutes: string;
  pvp: boolean;
  controls: string;
};

export type ArcadeMatchMode = "turn-based" | "score-race";

export const ARCADE_GAMES: ArcadeGame[] = [
  {
    slug: "tic-tac-toe",
    title: "Tic Tac Toe",
    short: "Minimax AI or a same-device match with your partner.",
    genre: "Strategy",
    difficulty: "Easy",
    emoji: "⭕",
    minutes: "3 min",
    pvp: true,
    controls: "Tap a cell. N starts a new board.",
  },
  {
    slug: "memory",
    title: "Memory Match",
    short: "Flip cards, find pairs, and beat the timer.",
    genre: "Puzzle",
    difficulty: "Easy",
    emoji: "🃏",
    minutes: "5 min",
    pvp: false,
    controls: "Tap cards to flip. R restarts.",
  },
  {
    slug: "snake",
    title: "Snake Zenia",
    short: "Neon arena snake with rival bots, combos, and power-ups.",
    genre: "Arcade",
    difficulty: "Medium",
    emoji: "🐍",
    minutes: "10 min",
    pvp: false,
    controls: "WASD or arrows. Space boosts. P pauses.",
  },
  {
    slug: "space-defender",
    title: "Space Defender",
    short: "Wave shooter with power-ups, asteroids, and bosses.",
    genre: "Arcade",
    difficulty: "Hard",
    emoji: "🚀",
    minutes: "15 min",
    pvp: false,
    controls: "Arrows or WASD to move. Space to shoot.",
  },
  {
    slug: "2048",
    title: "2048",
    short: "Slide tiles, merge numbers, and chase a new best.",
    genre: "Puzzle",
    difficulty: "Medium",
    emoji: "🔢",
    minutes: "8 min",
    pvp: false,
    controls: "Arrow keys or swipe. Z undoes.",
  },
  {
    slug: "typing-challenge",
    title: "Typing Speed Challenge",
    short: "Hit words for WPM and accuracy.",
    genre: "Educational",
    difficulty: "Easy",
    emoji: "⌨️",
    minutes: "5 min",
    pvp: false,
    controls: "Type, then space after each word.",
  },
  {
    slug: "maze-escape",
    title: "Maze Escape",
    short: "A new labyrinth every run. Find the exit in fewer moves.",
    genre: "Puzzle",
    difficulty: "Medium",
    emoji: "🌀",
    minutes: "12 min",
    pvp: false,
    controls: "Arrows or WASD. R for a new maze.",
  },
  {
    slug: "flappy-bird",
    title: "Flappy Bird",
    short: "One-tap arcade. Thread the pipes and hold a medal run.",
    genre: "Arcade",
    difficulty: "Hard",
    emoji: "🐦",
    minutes: "5 min",
    pvp: false,
    controls: "Space, click, or tap to flap.",
  },
  {
    slug: "chess-ai",
    title: "Chess AI",
    short: "Play White against a depth-search engine, levels 1–100.",
    genre: "Strategy",
    difficulty: "Expert",
    emoji: "♟️",
    minutes: "30 min",
    pvp: false,
    controls: "Tap a piece, then a square. U undoes.",
  },
  {
    slug: "sudoku",
    title: "Sudoku",
    short: "Fill the grid. Hints stay optional.",
    genre: "Puzzle",
    difficulty: "Medium",
    emoji: "🔲",
    minutes: "15 min",
    pvp: false,
    controls: "Tap a cell, then 1–9. H for a hint.",
  },
  {
    slug: "quiz",
    title: "Trivia Blitz",
    short: "Timed general-knowledge rounds with streak bonuses.",
    genre: "Educational",
    difficulty: "Easy",
    emoji: "❓",
    minutes: "10 min",
    pvp: false,
    controls: "Tap an answer, then continue.",
  },
  {
    slug: "tetris",
    title: "Neon Stack",
    short: "Modern Tetris with hold, ghost piece, and combos.",
    genre: "Puzzle",
    difficulty: "Medium",
    emoji: "▣",
    minutes: "12 min",
    pvp: false,
    controls: "Arrows move. Up rotates. Space hard-drops.",
  },
  {
    slug: "brick-break",
    title: "BrickBreak",
    short: "One-square gate, zigzag tunnel, bumpers, and +N / xN ball drops.",
    genre: "Arcade",
    difficulty: "Hard",
    emoji: "🧱",
    minutes: "8 min",
    pvp: false,
    controls: "Mouse, touch, or A D. Space launches. Catch +N / xN.",
  },
  {
    slug: "bitay",
    title: "BITAY",
    short: "Hangman with Animals, Sports, Food, Places, and Tech words.",
    genre: "Puzzle",
    difficulty: "Easy",
    emoji: "🪢",
    minutes: "6 min",
    pvp: false,
    controls: "Type or tap letters. Mute in the HUD.",
  },
  {
    slug: "bioverse",
    title: "BioVerse",
    short: "Walk DNA to RNA to protein in a short biology mission.",
    genre: "Educational",
    difficulty: "Medium",
    emoji: "🧬",
    minutes: "8 min",
    pvp: false,
    controls: "Tap the matching bases and codons.",
  },
];

export function arcadeGame(slug: string) {
  return ARCADE_GAMES.find((game) => game.slug === slug) ?? null;
}

export function isArcadeSlug(slug: string) {
  return ARCADE_GAMES.some((game) => game.slug === slug);
}

/** Every listed arcade game supports a partner challenge; the board game is turn-based and the rest are independent score races. */
export function arcadeMatchMode(slug: string): ArcadeMatchMode {
  return slug === "tic-tac-toe" ? "turn-based" : "score-race";
}
