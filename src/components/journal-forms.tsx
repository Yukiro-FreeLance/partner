"use client";

import { useActionState, useEffect, useState } from "react";
import { movieAction, movieReflectionAction, placeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { MovieWatchStatus } from "@/lib/domain";

type State = { error?: string };
type MovieFormData = { id?: string; title: string; tmdbId: number | null; posterUrl: string; releaseYear: string; genre: string; director: string; durationMinutes: string; watchedDate: string; status: MovieWatchStatus; rating: string; tags: string; visibility: string };
type SearchResult = { tmdbId: number; title: string; releaseYear: number | null; posterUrl: string | null; overview: string; genre: string[]; director: string | null; durationMinutes: number | null };

const visibility = <select name="visibility" defaultValue="private" className="h-11 rounded-2xl border bg-card px-3"><option value="private">Private</option><option value="partner">Share with partner</option><option value="public">Public</option></select>;

export function MovieForm({ movie }: { movie?: { id: string; title: string; tmdbId: number | null; posterUrl: string | null; releaseYear: number | null; genre: string[]; director: string | null; durationMinutes: number | null; watchedDate: string | null; status: MovieWatchStatus; rating: number | null; tags: string[]; visibility: string } }) {
  const [state, action, pending] = useActionState(movieAction, {} as State);
  const [form, setForm] = useState<MovieFormData>(() => ({ id: movie?.id, title: movie?.title ?? "", tmdbId: movie?.tmdbId ?? null, posterUrl: movie?.posterUrl ?? "", releaseYear: movie?.releaseYear ? String(movie.releaseYear) : "", genre: movie?.genre.join(", ") ?? "", director: movie?.director ?? "", durationMinutes: movie?.durationMinutes ? String(movie.durationMinutes) : "", watchedDate: movie?.watchedDate ?? "", status: movie?.status ?? "watched", rating: movie?.rating != null ? String(movie.rating) : "", tags: movie?.tags.join(", ") ?? "", visibility: movie?.visibility ?? "partner" }));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");

  useEffect(() => {
    if (movie || form.title.trim().length < 2) {
      setResults([]);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchMessage("");
      try {
        const response = await fetch(`/api/journal/movies/search?q=${encodeURIComponent(form.title.trim())}`, { signal: controller.signal });
        const body = await response.json() as { configured?: boolean; results?: SearchResult[] };
        if (!body.configured) setSearchMessage("Online movie search is not configured. You can still enter the details manually.");
        setResults(body.results ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) setSearchMessage("Movie search is temporarily unavailable.");
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [form.title, movie]);

  function change(field: keyof MovieFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value, ...(field === "title" ? { tmdbId: null } : {}) }));
  }

  function selectMovie(result: SearchResult) {
    setForm((current) => ({ ...current, tmdbId: result.tmdbId, title: result.title, releaseYear: result.releaseYear ? String(result.releaseYear) : "", posterUrl: result.posterUrl ?? "", genre: result.genre.join(", "), director: result.director ?? "", durationMinutes: result.durationMinutes ? String(result.durationMinutes) : "" }));
    setResults([]);
  }

  return <form action={action} className="grid gap-5">{state.error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p>}{movie && <input type="hidden" name="movieId" value={movie.id} />}<input type="hidden" name="tmdbId" value={form.tmdbId ?? ""} />
    <section className="grid gap-3 rounded-3xl border border-primary/10 bg-secondary/40 p-4"><div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Find your movie</p><p className="text-xs text-muted-foreground">Search online to fill the details automatically.</p></div>{searching && <span className="text-xs text-muted-foreground">Searching…</span>}</div><div className="relative"><Input name="title" required value={form.title} onChange={(event) => change("title", event.target.value)} placeholder="Search by movie title…" autoComplete="off" />{results.length > 0 && <div className="absolute inset-x-0 top-full z-20 mt-2 grid max-h-96 gap-1 overflow-y-auto rounded-2xl border bg-card p-2 shadow-xl">{results.map((result) => <button key={result.tmdbId} type="button" onClick={() => selectMovie(result)} className="flex gap-3 rounded-xl p-2 text-left hover:bg-secondary"><span className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">{result.posterUrl ? <img src={result.posterUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No poster</span>}</span><span className="min-w-0"><strong className="block truncate text-sm">{result.title}</strong><span className="text-xs text-muted-foreground">{result.releaseYear ?? "Release year unknown"}{result.genre.length ? ` · ${result.genre.slice(0, 2).join(", ")}` : ""}</span><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{result.overview}</span></span></button>)}</div>}</div>{searchMessage && <p className="text-xs text-muted-foreground">{searchMessage}</p>}</section>
    <section className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1 sm:col-span-2"><Label>Title</Label><Input value={form.title} onChange={(event) => change("title", event.target.value)} /></label><label className="grid gap-1"><Label>Release year</Label><Input name="releaseYear" type="number" value={form.releaseYear} onChange={(event) => change("releaseYear", event.target.value)} /></label><label className="grid gap-1"><Label>Duration (minutes)</Label><Input name="durationMinutes" type="number" value={form.durationMinutes} onChange={(event) => change("durationMinutes", event.target.value)} /></label></div><label className="grid gap-1"><Label>Genres</Label><Input name="genre" placeholder="Drama, Comedy" value={form.genre} onChange={(event) => change("genre", event.target.value)} /></label><label className="grid gap-1"><Label>Director</Label><Input name="director" value={form.director} onChange={(event) => change("director", event.target.value)} /></label><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1"><Label>Status</Label><select name="status" value={form.status} onChange={(event) => change("status", event.target.value)} className="h-11 rounded-2xl border bg-card px-3"><option value="watched">Watched</option><option value="watching">Currently watching</option><option value="want_to_watch">Want to watch</option></select></label><label className="grid gap-1"><Label>{form.status === "watched" ? "Watched date" : "Date"}</Label><Input name="watchedDate" type="date" value={form.watchedDate} onChange={(event) => change("watchedDate", event.target.value)} /></label><label className="grid gap-1"><Label>Rating / 10</Label><Input name="rating" type="number" min="0" max="10" step="0.5" value={form.rating} onChange={(event) => change("rating", event.target.value)} /></label></div><label className="grid gap-1"><Label>Tags</Label><Input name="tags" placeholder="comfort, favorite, learned" value={form.tags} onChange={(event) => change("tags", event.target.value)} /></label><label className="grid gap-1"><Label>Poster URL (optional)</Label><Input name="posterUrl" type="url" value={form.posterUrl} onChange={(event) => change("posterUrl", event.target.value)} /></label><label className="grid gap-1"><Label>Visibility</Label><select name="visibility" value={form.visibility} onChange={(event) => change("visibility", event.target.value)} className="h-11 rounded-2xl border bg-card px-3"><option value="private">Private</option><option value="partner">Share with partner</option><option value="public">Public</option></select></label></section><Button disabled={pending}>{pending ? "Saving…" : movie ? "Save movie" : "Add movie"}</Button></form>;
}

export function ReflectionForm({ movieId }: { movieId: string }) {
  const [state, action, pending] = useActionState(movieReflectionAction, {} as State);
  return <form action={action} className="grid gap-3"><input type="hidden" name="movieId" value={movieId} />{state.error && <p className="text-sm text-destructive">{state.error}</p>}<label className="grid gap-1"><Label>Reflection</Label><Textarea name="body" required placeholder="What stayed with you?" /></label><label className="grid gap-1"><Label>What did you learn?</Label><Textarea name="learned" /></label><label className="grid gap-1"><Label>Memorable scene</Label><Textarea name="memorableScene" /></label><label className="grid gap-1"><Label>Favorite character</Label><Input name="favoriteCharacter" /></label><label className="grid gap-1"><Label>Life lesson</Label><Textarea name="lifeLesson" /></label><label className="grid gap-1"><Label>Personal interpretation</Label><Textarea name="interpretation" /></label><label className="grid gap-1"><Label>Visibility</Label>{visibility}</label><Button disabled={pending}>{pending ? "Saving…" : "Save reflection"}</Button></form>;
}

export function PlaceForm() {
  const [state, action, pending] = useActionState(placeAction, {} as State);
  return <form action={action} className="grid gap-3">{state.error && <p className="text-sm text-destructive">{state.error}</p>}<label className="grid gap-1"><Label>Place name</Label><Input name="name" required placeholder="Rizal Park" /></label><label className="grid gap-1"><Label>Address</Label><Input name="address" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1"><Label>Latitude</Label><Input name="latitude" type="number" step="any" /></label><label className="grid gap-1"><Label>Longitude</Label><Input name="longitude" type="number" step="any" /></label></div><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1"><Label>Visited date</Label><Input name="visitedOn" type="date" /></label><label className="grid gap-1"><Label>Rating / 10</Label><Input name="rating" type="number" min="0" max="10" step="0.5" /></label><label className="grid gap-1"><Label>Category</Label><select name="category" defaultValue="other" className="h-11 rounded-2xl border bg-card px-3"><option value="nature">Nature</option><option value="restaurant">Restaurant</option><option value="tourist_attraction">Tourist attraction</option><option value="historical">Historical place</option><option value="other">Other</option></select></label></div><label className="grid gap-1"><Label>Photo URLs</Label><Input name="photoUrls" placeholder="https://… , https://…" /></label><label className="grid gap-1"><Label>Notes</Label><Textarea name="notes" /></label><label className="grid gap-1"><Label>Visit reflection</Label><Textarea name="reflection" /></label><label className="grid gap-1"><Label>Visibility</Label>{visibility}</label><Button disabled={pending}>{pending ? "Saving…" : "Add place"}</Button></form>;
}
