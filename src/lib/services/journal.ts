import type { JournalVisibility, MovieEntry, MovieReflection, VisitedPlace } from "@/lib/domain";
import type { Repository } from "@/lib/data/repository";
import { createId } from "@/lib/ids";
import { fail, ok } from "@/lib/result";
import { activeMembership } from "@/lib/services/access";

const now = () => new Date().toISOString();
const cleanList = (value?: string) => (value ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, 20);
const visibilityFor = (value: JournalVisibility): JournalVisibility => value;

export async function createMovie(repo: Repository, userId: string, input: Omit<MovieEntry, "id" | "userId" | "createdAt" | "updatedAt">) {
  const normalized = input.title.trim().toLowerCase();
  const existing = await repo.list("movieEntries", { eq: { userId } });
  if (existing.some((movie) => (input.tmdbId && movie.tmdbId === input.tmdbId) || (movie.title.trim().toLowerCase() === normalized && movie.releaseYear === input.releaseYear))) return fail("This movie is already in your journal.");
  const stamp = now();
  return ok(await repo.insert("movieEntries", { ...input, id: createId(), userId, createdAt: stamp, updatedAt: stamp }));
}

export async function updateMovie(repo: Repository, userId: string, id: string, patch: Partial<MovieEntry>) {
  const movie = await repo.find("movieEntries", { eq: { id, userId } });
  if (!movie) return fail("Movie not found.");
  return ok(await repo.update("movieEntries", id, { ...patch, updatedAt: now() }));
}

export async function deleteMovie(repo: Repository, userId: string, id: string) {
  const movie = await repo.find("movieEntries", { eq: { id, userId } });
  if (!movie) return fail("Movie not found.");
  await repo.removeWhere("movieReflections", { eq: { movieId: id, userId } });
  await repo.remove("movieEntries", id);
  return ok({ id });
}

export async function addMovieReflection(repo: Repository, userId: string, movieId: string, input: Omit<MovieReflection, "id" | "movieId" | "userId" | "createdAt" | "updatedAt">) {
  const movie = await repo.find("movieEntries", { eq: { id: movieId, userId } });
  if (!movie) return fail("Movie not found.");
  const stamp = now();
  return ok(await repo.insert("movieReflections", { ...input, id: createId(), movieId, userId, createdAt: stamp, updatedAt: stamp }));
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

export async function journalData(repo: Repository, userId: string) {
  try {
    const [movies, reflections, places, membership] = await Promise.all([
      repo.list("movieEntries", { eq: { userId } }, { orderBy: "watchedDate", descending: true }),
      repo.list("movieReflections", { eq: { userId } }, { orderBy: "createdAt", descending: true }),
      repo.list("visitedPlaces", { eq: { userId } }, { orderBy: "visitedOn", descending: true }),
      activeMembership(repo, userId),
    ]);
    return { movies, reflections, places, coupleId: membership?.coupleId ?? null, available: true, stats: { movies: movies.filter((movie) => movie.status === "watched").length, places: places.length, reflections: reflections.length } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (!/movie_entries|movie_reflections|visited_places|schema cache/i.test(message)) throw error;
    const membership = await activeMembership(repo, userId);
    return { movies: [], reflections: [], places: [], coupleId: membership?.coupleId ?? null, available: false, stats: { movies: 0, places: 0, reflections: 0 } };
  }
}

export { cleanList, visibilityFor };
