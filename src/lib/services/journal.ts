import type { JournalVisibility, MovieEntry, MovieReflection, PlaceReflection, VisitedPlace } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { fail, ok } from "@/lib/result";
import { activeMembership, couplePartners } from "@/lib/services/access";
import { entryContentType, entryIsChild } from "@/lib/watch";

const now = () => new Date().toISOString();
const cleanList = (value?: string) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
const visibilityFor = (value: JournalVisibility): JournalVisibility => value;

/** Seasons and episodes always belong to a series row owned by the same user. */
async function assertSeriesParent(repo: Repository, userId: string, seriesId: string | null) {
  if (!seriesId) return "Choose the TV series it belongs to.";
  const series = await repo.find("movieEntries", { eq: { id: seriesId, userId } });
  if (!series || entryIsChild(series.contentType)) return "That series was not found. Save the series first, then add it.";
  return null;
}

/** The other active members of the viewer's couple (empty when unpaired). */
export async function journalPartners(repo: Repository, userId: string) {
  const membership = await activeMembership(repo, userId);
  if (!membership) return [];
  return (await couplePartners(repo, membership.coupleId)).filter((member) => member.userId !== userId).map((member) => member.userId);
}

/** Given one user's rows, returns the watched-together entries plus children of watched-together series. */
function sharedMovieSubset(rows: MovieEntry[]) {
  const sharedSeries = new Set(rows.filter((row) => row.watchedTogether && entryContentType(row.contentType) === "series").map((row) => row.id));
  return rows.filter((row) => row.watchedTogether || (row.seriesId && sharedSeries.has(row.seriesId)));
}

/** A couple member's own entries plus whatever their partner marked as a shared memory. */
export async function visibleMovieEntries(repo: Repository, userId: string) {
  const partnerIds = await journalPartners(repo, userId);
  const [own, partnerRows] = await Promise.all([
    repo.list("movieEntries", { eq: { userId } }, { orderBy: "updatedAt", descending: true }),
    Promise.all(partnerIds.map((partnerId) => repo.list("movieEntries", { eq: { userId: partnerId } }, { orderBy: "updatedAt", descending: true }))),
  ]);
  return [...own, ...partnerRows.flatMap((entries) => sharedMovieSubset(entries))];
}

/** Finds a movie row the viewer may open: their own row, or a partner's watched-together entry (seasons/episodes follow their series). */
export async function visibleMovie(repo: Repository, userId: string, movieId: string) {
  const movie = await repo.find("movieEntries", { eq: { id: movieId } });
  if (!movie) return null;
  if (movie.userId === userId) return movie;
  let owner = movie;
  if (entryIsChild(movie.contentType)) {
    const parent = movie.seriesId ? await repo.find("movieEntries", { eq: { id: movie.seriesId } }) : null;
    if (!parent) return null;
    if (parent.userId !== movie.userId) return null;
    owner = parent;
  }
  if (movie.watchedTogether || owner.watchedTogether) {
    const partnerIds = await journalPartners(repo, userId);
    if (partnerIds.includes(owner.userId)) return movie;
  }
  return null;
}

export async function createMovie(repo: Repository, userId: string, input: Omit<MovieEntry, "id" | "userId" | "createdAt" | "updatedAt">) {
  if (entryIsChild(input.contentType)) {
    const seriesError = await assertSeriesParent(repo, userId, input.seriesId);
    if (seriesError) return fail(seriesError);
  } else {
    const normalized = input.title.trim().toLowerCase();
    const existing = await repo.list("movieEntries", { eq: { userId } });
    if (existing.some((movie) => entryContentType(movie.contentType) === input.contentType && ((input.tmdbId && movie.tmdbId === input.tmdbId) || (movie.title.trim().toLowerCase() === normalized && movie.releaseYear === input.releaseYear)))) return fail("This entry is already in your journal.");
  }
  const stamp = now();
  return ok(await repo.insert("movieEntries", { ...input, id: createId(), userId, createdAt: stamp, updatedAt: stamp }));
}

export async function updateMovie(repo: Repository, userId: string, id: string, patch: Partial<MovieEntry>) {
  const movie = await repo.find("movieEntries", { eq: { id, userId } });
  if (!movie) return fail("Entry not found.");
  if (entryIsChild(patch.contentType ?? movie.contentType)) {
    const seriesError = await assertSeriesParent(repo, userId, patch.seriesId ?? movie.seriesId);
    if (seriesError) return fail(seriesError);
  }
  return ok(await repo.update("movieEntries", id, { ...patch, updatedAt: now() }));
}

export async function deleteMovie(repo: Repository, userId: string, id: string) {
  const movie = await repo.find("movieEntries", { eq: { id, userId } });
  if (!movie) return fail("Entry not found.");
  // Deleting a series removes its seasons and episodes too (the SQL foreign key cascades; explicit here for the memory store).
  // Partner reflections on these entries go away with them, so remove by movie rather than by author.
  const children = await repo.list("movieEntries", { eq: { seriesId: id, userId } });
  for (const child of children) {
    await repo.removeWhere("movieReflections", { eq: { movieId: child.id } });
    await repo.remove("movieEntries", child.id);
  }
  await repo.removeWhere("movieReflections", { eq: { movieId: id } });
  await repo.remove("movieEntries", id);
  return ok({ id });
}

export async function addMovieReflection(repo: Repository, userId: string, movieId: string, input: Omit<MovieReflection, "id" | "movieId" | "userId" | "createdAt" | "updatedAt">) {
  const movie = await visibleMovie(repo, userId, movieId);
  if (!movie) return fail("Entry not found.");
  const stamp = now();
  return ok(await repo.insert("movieReflections", { ...input, imageUrls: Array.isArray(input.imageUrls) ? input.imageUrls.slice(0, 12) : [], id: createId(), movieId, userId, createdAt: stamp, updatedAt: stamp }));
}

export async function deleteReflection(repo: Repository, userId: string, id: string) {
  const reflection = await repo.find("movieReflections", { eq: { id, userId } });
  if (!reflection) return fail("Reflection not found.");
  await repo.remove("movieReflections", id);
  return ok({ id });
}

export async function createPlace(repo: Repository, userId: string, input: Omit<VisitedPlace, "id" | "userId" | "createdAt" | "updatedAt">) {
  const existing = await repo.list("visitedPlaces", { eq: { userId } });
  if (existing.some((place) => place.name.trim().toLowerCase() === input.name.trim().toLowerCase() && place.visitedOn === input.visitedOn)) return fail("This place is already logged for that date.");
  const stamp = now();
  return ok(await repo.insert("visitedPlaces", { ...input, id: createId(), userId, createdAt: stamp, updatedAt: stamp }));
}

export async function deletePlace(repo: Repository, userId: string, id: string) {
  const place = await repo.find("visitedPlaces", { eq: { id, userId } });
  if (!place) return fail("Place not found.");
  await repo.remove("visitedPlaces", id);
  return ok({ id });
}

/** Partner places marked "visited together" plus the viewer's own places. */
export async function visiblePlaces(repo: Repository, userId: string) {
  const partnerIds = await journalPartners(repo, userId);
  const [own, partnerRows] = await Promise.all([
    repo.list("visitedPlaces", { eq: { userId } }, { orderBy: "visitedOn", descending: true }),
    Promise.all(partnerIds.map((partnerId) => repo.list("visitedPlaces", { eq: { userId: partnerId, visitedTogether: true } }, { orderBy: "visitedOn", descending: true }))),
  ]);
  return [...own, ...partnerRows.flat()];
}

export async function visiblePlace(repo: Repository, userId: string, placeId: string) {
  const place = await repo.find("visitedPlaces", { eq: { id: placeId } });
  if (!place) return null;
  if (place.userId === userId) return place;
  if (place.visitedTogether) {
    const partnerIds = await journalPartners(repo, userId);
    if (partnerIds.includes(place.userId)) return place;
  }
  return null;
}

export async function addPlaceReflection(repo: Repository, userId: string, placeId: string, input: Omit<PlaceReflection, "id" | "placeId" | "userId" | "createdAt" | "updatedAt">) {
  const place = await visiblePlace(repo, userId, placeId);
  if (!place) return fail("Place not found.");
  const stamp = now();
  return ok(await repo.insert("placeReflections", { ...input, imageUrls: Array.isArray(input.imageUrls) ? input.imageUrls.slice(0, 12) : [], id: createId(), placeId, userId, createdAt: stamp, updatedAt: stamp }));
}

export async function deletePlaceReflection(repo: Repository, userId: string, id: string) {
  const reflection = await repo.find("placeReflections", { eq: { id, userId } });
  if (!reflection) return fail("Reflection not found.");
  await repo.remove("placeReflections", id);
  return ok({ id });
}

/** Children roll up under their series, so the headline stats count main entries only. */
function isMainEntry(entry: MovieEntry) {
  const type = entryContentType(entry.contentType);
  return type === "movie" || type === "series";
}
export async function journalData(repo: Repository, userId: string) {
  try {
    const [movies, reflections, places, membership] = await Promise.all([
      visibleMovieEntries(repo, userId),
      repo.list("movieReflections", { eq: { userId } }, { orderBy: "createdAt", descending: true }),
      visiblePlaces(repo, userId),
      activeMembership(repo, userId),
    ]);
    const ownMovies = movies.filter((entry) => entry.userId === userId);
    const ownPlaces = places.filter((place) => place.userId === userId);
    return { movies, reflections, places, coupleId: membership?.coupleId ?? null, available: true, stats: { movies: ownMovies.filter((entry) => isMainEntry(entry) && entry.status === "watched").length, places: ownPlaces.length, reflections: reflections.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/movie_entries|movie_reflections|place_reflections|visited_places|schema cache/i.test(message)) throw error;
    const membership = await activeMembership(repo, userId);
    return { movies: [], reflections: [], places: [], coupleId: membership?.coupleId ?? null, available: false, stats: { movies: 0, places: 0, reflections: 0 } };
  }
}

export { cleanList, visibilityFor };
