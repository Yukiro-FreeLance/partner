import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";

export async function GET(request: Request) {
  await requireUser();
  const query = new URL(request.url).searchParams.get("q")?.trim();
  const key = process.env.TMDB_API_KEY;
  if (!query || query.length < 2) return NextResponse.json({ results: [] });
  if (!key) return NextResponse.json({ results: [], configured: false });
  const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${encodeURIComponent(key)}&include_adult=false&language=en-US&query=${encodeURIComponent(query)}`, { next: { revalidate: 3600 } });
  if (!response.ok) return NextResponse.json({ results: [] }, { status: 502 });
  const body = (await response.json()) as { results?: Array<{ id: number; title: string; release_date?: string; poster_path?: string; overview?: string }> };
  return NextResponse.json({ configured: true, results: (body.results ?? []).slice(0, 8).map((movie) => ({ tmdbId: movie.id, title: movie.title, releaseYear: movie.release_date?.slice(0, 4) ? Number(movie.release_date.slice(0, 4)) : null, posterUrl: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : null, overview: movie.overview ?? "" })) });
}
