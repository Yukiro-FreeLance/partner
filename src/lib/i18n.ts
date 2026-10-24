export type AppLocale = "en" | "fil";

const navigation = {
  en: {
    home: "Home",
    play: "Play",
    personality: "Personality",
    connection: "Connection",
    memories: "Memories",
    profile: "Profile",
    logout: "Log out",
    skip: "Skip to content",
  },
  fil: {
    home: "Tahanan",
    play: "Laro",
    personality: "Personalidad",
    connection: "Koneksyon",
    memories: "Alaala",
    profile: "Profile",
    logout: "Mag-logout",
    skip: "Lumaktaw sa nilalaman",
  },
} as const;

export function appLocale(value: string | null | undefined): AppLocale {
  return value === "fil" ? "fil" : "en";
}

export function navigationCopy(locale: string) {
  return navigation[appLocale(locale)];
}
