import type { WatchContentType } from "@/lib/domain";

export const watchContentTypes: WatchContentType[] = ["movie", "series", "season", "episode", "other"];

type ContentTypeCopy = { label: string; blurb: string };

export const watchContentTypeCopy: Record<WatchContentType, ContentTypeCopy> = {
  movie: { label: "Movie", blurb: "One film with a cover and your reflection." },
  series: { label: "TV series", blurb: "Track the show, then add its seasons and episodes." },
  season: { label: "Season", blurb: "Part of a series — upload multiple images and reflect per season." },
  episode: { label: "Episode", blurb: "A single episode with its own images and reflection." },
  other: { label: "Other", blurb: "Documentaries, shorts, anime — flexible fields." },
};

/** Old rows persisted before content types existed fall back to "movie". */
export function entryContentType(contentType: WatchContentType | null | undefined): WatchContentType {
  return contentType === "series" || contentType === "season" || contentType === "episode" || contentType === "other" ? contentType : "movie";
}

export function entryIsChild(contentType: WatchContentType | null | undefined) {
  return entryContentType(contentType) === "season" || entryContentType(contentType) === "episode";
}

/** Legacy rows may have no images array; normalize defensively. */
export function entryImages(images: string[] | null | undefined): string[] {
  return Array.isArray(images) ? images : [];
}

/** TMDB movie genre names — the options for the genre multiselect (matches what an online search fills in). */
export const movieGenreOptions = [
  "Action",
  "Adventure",
  "Animation",
  "Comedy",
  "Crime",
  "Documentary",
  "Drama",
  "Family",
  "Fantasy",
  "History",
  "Horror",
  "Music",
  "Mystery",
  "Romance",
  "Science Fiction",
  "TV Movie",
  "Thriller",
  "War",
  "Western",
];

/** Short chip such as "Movie", "Season 2", "S2 E4", or the custom label for "other". */
export function contentBadge(entry: { contentType?: WatchContentType | null; customType?: string | null; seasonNumber?: number | null; episodeNumber?: number | null }) {
  const type = entryContentType(entry.contentType);
  switch (type) {
    case "series":
      return "TV series";
    case "season":
      return entry.seasonNumber != null ? `Season ${entry.seasonNumber}` : "Season";
    case "episode":
      return [entry.seasonNumber != null ? `S${entry.seasonNumber}` : null, entry.episodeNumber != null ? `E${entry.episodeNumber}` : null].filter(Boolean).join(" · ") || "Episode";
    case "other":
      return entry.customType?.trim() ? entry.customType.trim() : "Other";
    default:
      return "Movie";
  }
}

/** Fields that only make sense per content type drive which labels the UI shows. */
export function titlePlaceholderFor(contentType: WatchContentType) {
  switch (contentType) {
    case "series":
      return "e.g. Break Point";
    case "season":
      return "Optional — e.g. The Comeback Season";
    case "episode":
      return "Optional — e.g. I Choose You";
    case "other":
      return "e.g. Lisbon travel vlog";
    default:
      return "e.g. Eternal Sunshine of the Spotless Mind";
  }
}

/** Auto title for season/episode/other entries left untitled. */
export function fallbackTitle(contentType: WatchContentType, input: { seasonNumber: number | null; episodeNumber: number | null; customType: string | null }) {
  if (contentType === "season") return input.seasonNumber != null ? `Season ${input.seasonNumber}` : "Season";
  if (contentType === "episode") return [input.seasonNumber != null ? `S${input.seasonNumber}` : null, input.episodeNumber != null ? `E${input.episodeNumber}` : null].filter(Boolean).join(" · ") || "Episode";
  if (contentType === "other") return input.customType?.trim() ? `${input.customType.trim()} — untitled` : "Untitled";
  return "Untitled";
}
