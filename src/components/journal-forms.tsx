"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Check, ChevronDown, Film, ImagePlus, Layers, MonitorPlay, Shapes, Tv, X } from "lucide-react";
import { movieAction, movieReflectionAction, placeAction, placeReflectionAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/field";
import type { MovieWatchStatus, WatchContentType } from "@/lib/domain";
import { entryContentType, entryImages, movieGenreOptions, titlePlaceholderFor, watchContentTypes, watchContentTypeCopy } from "@/lib/watch";

type State = { error?: string };
type MovieFormData = { id?: string; title: string; tmdbId: number | null; posterUrl: string; releaseYear: string; director: string; durationMinutes: string; watchedDate: string; status: MovieWatchStatus; rating: string; tags: string; visibility: string; contentType: WatchContentType; customType: string; seriesId: string; seasonNumber: string; episodeNumber: string; watchedWith: string; mood: string };
type SearchResult = { tmdbId: number; title: string; releaseYear: number | null; posterUrl: string | null; overview: string; genre: string[]; director: string | null; durationMinutes: number | null };
type SeriesOption = { id: string; title: string };
type MovieFormEntry = {
  id: string; title: string; tmdbId: number | null; posterUrl: string | null; releaseYear: number | null; genre: string[]; director: string | null;
  durationMinutes: number | null; watchedDate: string | null; status: MovieWatchStatus; rating: number | null; tags: string[]; visibility: string;
  contentType?: WatchContentType | null; customType?: string | null; seriesId?: string | null; seasonNumber?: number | null; episodeNumber?: number | null;
  watchedWith?: string | null; mood?: string | null; images?: string[] | null; watchedTogether?: boolean | null;
};

const visibility = <select name="visibility" defaultValue="private" className="h-11 rounded-2xl border bg-card px-3"><option value="private">Private</option><option value="partner">Share with partner</option><option value="public">Public</option></select>;

/** Multi-select genre dropdown — options follow TMDB's genre list, extra values from older entries stay checked. */
function GenrePicker({ value, onChange }: { value: string[]; onChange: (genres: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    function onOutsideClick(event: MouseEvent) { if (!ref.current?.contains(event.target as Node)) setOpen(false); }
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onKeyDown);
    return () => { document.removeEventListener("mousedown", onOutsideClick); document.removeEventListener("keydown", onKeyDown); };
  }, [open]);
  const options = [...movieGenreOptions, ...value.filter((genre) => !movieGenreOptions.includes(genre))];
  return <div ref={ref} className="relative grid gap-1">
    <Label>Genres</Label>
    <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((current) => !current)} className="flex h-11 min-w-0 items-center justify-between gap-2 rounded-2xl border bg-card px-3 text-left text-sm">
      <span className="truncate">{value.length ? value.slice(0, 3).join(", ") + (value.length > 3 ? ` +${value.length - 3}` : "") : "Choose genres…"}</span>
      <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
    {open && <div role="listbox" aria-label="Genres" className="absolute inset-x-0 top-full z-20 mt-2 grid max-h-72 grid-cols-2 gap-1 overflow-y-auto rounded-2xl border bg-card p-2 shadow-xl">
      {options.map((genre) => {
        const picked = value.includes(genre);
        return <button key={genre} type="button" role="option" aria-selected={picked} onClick={() => onChange(picked ? value.filter((item) => item !== genre) : [...value, genre])} className={`flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm transition ${picked ? "bg-accent text-primary" : "hover:bg-secondary"}`}>
          <span className={`flex size-4 shrink-0 items-center justify-center rounded border ${picked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{picked && <Check className="size-3" aria-hidden />}</span>
          <span className="min-w-0 truncate">{genre}</span>
        </button>;
      })}
    </div>}
    {value.map((genre) => <input key={genre} type="hidden" name="genre" value={genre} />)}
  </div>;
}

const contentTypeIcons: Record<WatchContentType, LucideIcon> = { movie: Film, series: Tv, season: Layers, episode: MonitorPlay, other: Shapes };

const typeCopy = {
  title: { movie: "Movie title", series: "Series title", season: "Season title (optional)", episode: "Episode title (optional)", other: "Title" } as Record<WatchContentType, string>,
  poster: { movie: "Poster URL (optional)", series: "Cover URL (optional)" } as Partial<Record<WatchContentType, string>>,
  gallery: {
    movie: "Poster & stills",
    series: "Series gallery",
    season: "Season gallery",
    episode: "Episode gallery",
    other: "Images",
  } as Record<WatchContentType, string>,
  galleryHint: {
    movie: "Upload a cover or stills from the film — the first image becomes its cover.",
    series: "Add artwork and behind-the-scenes photos — the first image becomes the cover.",
    season: "Upload as many images as you want for this season.",
    episode: "Upload images that capture this episode.",
    other: "Add any images that go with this entry.",
  } as Record<WatchContentType, string>,
};

export function MovieForm({ movie, seriesOptions = [], initialContentType, initialSeriesId }: { movie?: MovieFormEntry; seriesOptions?: SeriesOption[]; initialContentType?: string | null; initialSeriesId?: string | null }) {
  const [state, action, pending] = useActionState(movieAction, {} as State);
  const contentType = movie ? entryContentType(movie.contentType) : watchContentTypes.includes((initialContentType ?? "") as WatchContentType) ? (initialContentType as WatchContentType) : "movie";
  const [form, setForm] = useState<MovieFormData>(() => ({
    id: movie?.id,
    title: movie?.title ?? "",
    tmdbId: movie?.tmdbId ?? null,
    posterUrl: movie?.posterUrl ?? "",
    releaseYear: movie?.releaseYear ? String(movie.releaseYear) : "",
    director: movie?.director ?? "",
    durationMinutes: movie?.durationMinutes ? String(movie.durationMinutes) : "",
    watchedDate: movie?.watchedDate ?? "",
    status: movie?.status ?? "watched",
    rating: movie?.rating != null ? String(movie.rating) : "",
    tags: movie?.tags.join(", ") ?? "",
    visibility: movie?.visibility ?? "partner",
    contentType,
    customType: movie?.customType ?? "",
    seriesId: movie?.seriesId ?? initialSeriesId ?? "",
    seasonNumber: movie?.seasonNumber != null ? String(movie.seasonNumber) : "",
    episodeNumber: movie?.episodeNumber != null ? String(movie.episodeNumber) : "",
    watchedWith: movie?.watchedWith ?? "",
    mood: movie?.mood ?? "",
  }));
  const [genres, setGenres] = useState<string[]>(movie?.genre ?? []);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState("");
  const [images, setImages] = useState<string[]>(() => entryImages(movie?.images));

  const type = form.contentType;
  const isChild = type === "season" || type === "episode";
  const searchingType = type === "movie";
  const searchActive = searchingType && !movie && form.title.trim().length >= 2;

  useEffect(() => {
    if (!searchActive) return;
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
  }, [searchActive, form.title, movie]);

  function change(field: keyof MovieFormData, value: string) {
    setForm((current) => ({ ...current, [field]: value, ...(field === "title" ? { tmdbId: null } : {}) }));
  }

  function changeType(next: WatchContentType) {
    setForm((current) => ({ ...current, contentType: next, tmdbId: next === "movie" ? current.tmdbId : null }));
    setResults([]);
    setSearchMessage("");
  }

  function selectMovie(result: SearchResult) {
    setForm((current) => ({ ...current, tmdbId: result.tmdbId, title: result.title, releaseYear: result.releaseYear ? String(result.releaseYear) : "", posterUrl: result.posterUrl ?? "", director: result.director ?? "", durationMinutes: result.durationMinutes ? String(result.durationMinutes) : "", contentType: "movie" }));
    setGenres(result.genre.slice(0, 20));
    setResults([]);
  }

  return <form action={action} className="grid gap-5">{state.error && <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{state.error}</p>}{movie && <input type="hidden" name="movieId" value={movie.id} />}<input type="hidden" name="tmdbId" value={form.tmdbId ?? ""} />
    <section className="grid gap-3 rounded-3xl border border-primary/10 bg-secondary/40 p-4">
      <div>
        <p className="font-semibold">What are you logging?</p>
        <p className="text-xs text-muted-foreground">The form adapts to the content type you pick.</p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{watchContentTypes.map((item) => {
        const Icon = contentTypeIcons[item];
        const picked = item === type;
        return <button key={item} type="button" onClick={() => changeType(item)} aria-pressed={picked} className={`flex items-center gap-2 rounded-2xl border p-3 text-left text-sm transition ${picked ? "border-primary bg-accent text-primary" : "border-border bg-card hover:border-primary/30 hover:bg-secondary"}`}><Icon className="size-4 shrink-0" aria-hidden /><span className="min-w-0"><strong className="block truncate">{watchContentTypeCopy[item].label}</strong></span></button>;
      })}</div>
      <p className="text-xs text-muted-foreground">{watchContentTypeCopy[type].blurb}</p>
    </section>
    {isChild && <input type="hidden" name="posterUrl" value={form.posterUrl} />}
    {isChild && <section className="grid gap-3 rounded-3xl border p-4">
      <p className="font-semibold">Part of</p>
      <label className="grid gap-1">
        <Label>TV series</Label>
        <select name="seriesId" value={form.seriesId} onChange={(event) => change("seriesId", event.target.value)} required className="h-11 rounded-2xl border bg-card px-3">
          <option value="">Choose a series…</option>
          {seriesOptions.map((series) => <option key={series.id} value={series.id}>{series.title}</option>)}
        </select>
      </label>
      {seriesOptions.length === 0 && <p className="rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground">You have no series yet. Switch to “TV series” to add one first, then log its {type === "season" ? "seasons" : "episodes"}.</p>}
    </section>}
    {searchingType && <section className="grid gap-3 rounded-3xl border border-primary/10 bg-secondary/40 p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="font-semibold">Find your movie</p><p className="text-xs text-muted-foreground">Search online to fill the details automatically.</p></div>{searching && <span className="text-xs text-muted-foreground">Searching…</span>}</div>
      <div className="relative">
        <Input name="title" required value={form.title} onChange={(event) => change("title", event.target.value)} placeholder="Search by movie title…" autoComplete="off" />{searchActive && results.length > 0 && <div className="absolute inset-x-0 top-full z-20 mt-2 grid max-h-96 gap-1 overflow-y-auto rounded-2xl border bg-card p-2 shadow-xl">{results.map((result) => <button key={result.tmdbId} type="button" onClick={() => selectMovie(result)} className="flex gap-3 rounded-xl p-2 text-left hover:bg-secondary"><span className="h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-secondary">{result.posterUrl ? <img src={result.posterUrl} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No poster</span>}</span><span className="min-w-0"><strong className="block truncate text-sm">{result.title}</strong><span className="text-xs text-muted-foreground">{result.releaseYear ?? "Release year unknown"}{result.genre.length ? ` · ${result.genre.slice(0, 2).join(", ")}` : ""}</span><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{result.overview}</span></span></button>)}</div>}
      </div>
      {searchMessage && <p className="text-xs text-muted-foreground">{searchMessage}</p>}
    </section>}
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {!searchingType && <label className={`grid gap-1 ${isChild ? (type === "episode" ? "sm:col-span-1" : "sm:col-span-2") : "sm:col-span-3"}`}>
          <Label>{typeCopy.title[type]}</Label>
          <Input name="title" value={form.title} onChange={(event) => change("title", event.target.value)} placeholder={titlePlaceholderFor(type)} required={type === "series"} />
        </label>}
        {isChild && <label className="grid gap-1"><Label>Season number</Label><Input name="seasonNumber" type="number" min="1" required value={form.seasonNumber} onChange={(event) => change("seasonNumber", event.target.value)} /></label>}
        {type === "episode" && <label className="grid gap-1"><Label>Episode number</Label><Input name="episodeNumber" type="number" min="1" required value={form.episodeNumber} onChange={(event) => change("episodeNumber", event.target.value)} /></label>}
      </div>
      {type === "other" && <label className="grid gap-1"><Label>What kind is it?</Label><Input name="customType" value={form.customType} onChange={(event) => change("customType", event.target.value)} placeholder="Documentary, anime, short film…" /></label>}
      {!isChild && <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1"><Label>Release year</Label><Input name="releaseYear" type="number" value={form.releaseYear} onChange={(event) => change("releaseYear", event.target.value)} /></label>
        <label className="grid gap-1"><Label>{type === "series" ? "Average episode runtime (min)" : "Duration (minutes)"}</Label><Input name="durationMinutes" type="number" value={form.durationMinutes} onChange={(event) => change("durationMinutes", event.target.value)} /></label>
      </div>}
      {!isChild && <>
        <GenrePicker value={genres} onChange={setGenres} />
        <label className="grid gap-1"><Label>{type === "series" ? "Creator / showrunner" : "Director"}</Label><Input name="director" value={form.director} onChange={(event) => change("director", event.target.value)} /></label>
        <label className="grid gap-1"><Label>{typeCopy.poster[type] ?? "Poster URL (optional)"}</Label><Input name="posterUrl" type="url" value={form.posterUrl} onChange={(event) => change("posterUrl", event.target.value)} /></label>
      </>}
    </section>
    <section className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="grid gap-1"><Label>Status</Label><select name="status" value={form.status} onChange={(event) => change("status", event.target.value)} className="h-11 rounded-2xl border bg-card px-3"><option value="watched">Watched</option><option value="watching">Currently watching</option><option value="want_to_watch">Want to watch</option></select></label>
        <label className="grid gap-1"><Label>{form.status === "watched" ? "Watched date" : "Date"}</Label><Input name="watchedDate" type="date" value={form.watchedDate} onChange={(event) => change("watchedDate", event.target.value)} /></label>
        <label className="grid gap-1"><Label>Rating / 10</Label><Input name="rating" type="number" min="0" max="10" step="0.5" value={form.rating} onChange={(event) => change("rating", event.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1"><Label>Watched with</Label><Input name="watchedWith" value={form.watchedWith} onChange={(event) => change("watchedWith", event.target.value)} placeholder="Partner, solo, friends…" /></label>
        <label className="grid gap-1"><Label>Mood</Label><Input name="mood" value={form.mood} onChange={(event) => change("mood", event.target.value)} placeholder="Cozy, nostalgic, thrilling…" /></label>
      </div>
      <label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-secondary/40 px-4 py-3 text-sm">
        <input name="watchedTogether" type="checkbox" defaultChecked={Boolean(movie?.watchedTogether)} className="mt-1 size-4" />
        <span><strong>Watched together</strong><br /><span className="text-muted-foreground">Show this entry in your partner&apos;s watch list too, so they can share their own reflection on it.</span></span>
      </label>
      <label className="grid gap-1"><Label>Tags</Label><Input name="tags" placeholder="comfort, favorite, learned" value={form.tags} onChange={(event) => change("tags", event.target.value)} /></label>
      <label className="grid gap-1"><Label>Visibility</Label><select name="visibility" value={form.visibility} onChange={(event) => change("visibility", event.target.value)} className="h-11 rounded-2xl border bg-card px-3"><option value="private">Private</option><option value="partner">Share with partner</option><option value="public">Public</option></select></label>
    </section>
    <ImageGalleryField imageUrl={type === "movie" ? form.posterUrl : undefined} initialImages={images} label={typeCopy.gallery[type]} hint={typeCopy.galleryHint[type]} onImagesChange={setImages} />
    {type === "series" && <p className="rounded-2xl border border-primary/10 bg-secondary/50 px-4 py-3 text-sm text-muted-foreground">After saving, open this series to add its seasons and episodes — each with its own images and reflection.</p>}
    {!movie && <label className="grid gap-1"><Label>Personal reflection</Label><Textarea name="reflection" placeholder="What stayed with you? Save it now and add more reflections later." /></label>}
    <Button disabled={pending}>{pending ? "Saving…" : movie ? "Save changes" : type === "series" ? "Add series" : type === "season" ? "Add season" : type === "episode" ? "Add episode" : type === "other" ? "Add entry" : "Add movie"}</Button>
  </form>;
}

export function ReflectionForm({ movieId, label = "Reflection" }: { movieId: string; label?: string }) {
  const [state, action, pending] = useActionState(movieReflectionAction, {} as State);
  return <form action={action} className="grid gap-3"><input type="hidden" name="movieId" value={movieId} />{state.error && <p className="text-sm text-destructive">{state.error}</p>}<label className="grid gap-1"><Label>{label}</Label><Textarea name="body" required placeholder="What stayed with you?" /></label><label className="grid gap-1"><Label>What did you learn?</Label><Textarea name="learned" /></label><label className="grid gap-1"><Label>Memorable scene</Label><Textarea name="memorableScene" /></label><label className="grid gap-1"><Label>Favorite character</Label><Input name="favoriteCharacter" /></label><label className="grid gap-1"><Label>Life lesson</Label><Textarea name="lifeLesson" /></label><label className="grid gap-1"><Label>Personal interpretation</Label><Textarea name="interpretation" /></label><ImageGalleryField initialImages={[]} label="Images for this reflection" hint="Stills or photos that go with this reflection." /><label className="grid gap-1"><Label>Visibility</Label>{visibility}</label><Button disabled={pending}>{pending ? "Saving…" : "Save reflection"}</Button></form>;
}

export function PlaceReflectionForm({ placeId, label = "Your reflection" }: { placeId: string; label?: string }) {
  const [state, action, pending] = useActionState(placeReflectionAction, {} as State);
  return <form action={action} className="grid gap-3"><input type="hidden" name="placeId" value={placeId} />{state.error && <p className="text-sm text-destructive">{state.error}</p>}<label className="grid gap-1"><Label>{label}</Label><Textarea name="body" required placeholder="What did this place leave with you?" /></label><ImageGalleryField initialImages={[]} label="Photos for this reflection" hint="Snapshots that go with this memory." /><label className="grid gap-1"><Label>Visibility</Label>{visibility}</label><Button disabled={pending}>{pending ? "Saving…" : "Save reflection"}</Button></form>;
}

/** Multi-image upload used by the watch-entry, reflection, and place forms. Emits one hidden input per stored file. */
export function ImageGalleryField({ initialImages, label, hint, imageUrl, name = "image", onImagesChange }: { initialImages?: string[]; label: string; hint?: string; imageUrl?: string; name?: string; onImagesChange?: (images: string[]) => void }) {
  const [images, setImages] = useState<string[]>(initialImages ?? []);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");

  function update(change: string[] | ((current: string[]) => string[])) {
    setImages((current) => {
      const next = typeof change === "function" ? change(current) : change;
      onImagesChange?.(next);
      return next;
    });
  }

  async function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    setError("");
    for (const file of files) {
      if (file.type && !file.type.startsWith("image/") && !/\.(jpe?g|png|webp|gif)$/i.test(file.name)) {
        setError(`${file.name}: use a JPEG, PNG, WEBP, or GIF image.`);
        continue;
      }
      if (file.size > 5_000_000) {
        setError(`${file.name} is larger than 5 MB.`);
        continue;
      }
      setPendingCount((count) => count + 1);
      try {
        const body = new FormData();
        body.set("file", file);
        body.set("purpose", "film");
        const response = await fetch("/api/media", { method: "POST", body });
        const json = (await response.json().catch(() => ({}))) as { id?: string; error?: string };
        if (response.ok && json.id) update((current) => (current.length >= 12 ? current : [...current, `/api/media/${json.id}`]));
        else setError(json.error ?? `${file.name} could not be saved.`);
      } catch {
        setError(`${file.name} could not be saved. Check your connection and try again.`);
      } finally {
        setPendingCount((count) => Math.max(0, count - 1));
      }
    }
  }

  return <div className="grid gap-2">
    <Label>{label}</Label>
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    {imageUrl && <div className="flex gap-3 rounded-2xl border bg-secondary/40 p-3">
      <span className="h-24 w-16 shrink-0 overflow-hidden rounded-lg bg-secondary">{imageUrl ? <img src={imageUrl} alt="" className="h-full w-full object-cover" /> : null}</span>
      <span className="min-w-0 text-xs text-muted-foreground"><strong className="block text-sm text-foreground">Current cover</strong>This cover can still be replaced from the poster URL above, or with the first gallery image below.</span>
    </div>}
    {images.length > 0 && <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{images.map((url) => <div key={url} className="group relative aspect-[3/4] overflow-hidden rounded-xl border bg-secondary">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <button type="button" onClick={() => update(images.filter((item) => item !== url))} aria-label="Remove image" className="absolute right-1 top-1 rounded-full bg-white/90 p-1 text-foreground shadow"><X className="size-3.5" aria-hidden /></button>
      <input type="hidden" name={name} value={url} />
    </div>)}</div>}
    <label className="flex cursor-pointer flex-col items-center gap-1 rounded-2xl border border-dashed px-4 py-4 text-center text-sm text-muted-foreground transition hover:border-primary/40 hover:bg-secondary/50">
      <ImagePlus className="size-5 text-primary" aria-hidden />
      {pendingCount > 0 ? `Uploading ${pendingCount} image${pendingCount === 1 ? "" : "s"}…` : "Choose images to upload"}
      <span className="text-xs">JPEG, PNG, WEBP, or GIF · up to 5 MB each</span>
      <input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" className="sr-only" disabled={pendingCount > 0} onChange={(event) => void onChange(event)} />
    </label>
    {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
  </div>;
}

export function PlaceForm() {
  const [state, action, pending] = useActionState(placeAction, {} as State);
  return <form action={action} className="grid gap-3">{state.error && <p className="text-sm text-destructive">{state.error}</p>}<label className="grid gap-1"><Label>Place name</Label><Input name="name" required placeholder="Rizal Park" /></label><label className="grid gap-1"><Label>Address</Label><Input name="address" /></label><div className="grid gap-3 sm:grid-cols-2"><label className="grid gap-1"><Label>Latitude</Label><Input name="latitude" type="number" step="any" /></label><label className="grid gap-1"><Label>Longitude</Label><Input name="longitude" type="number" step="any" /></label></div><div className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1"><Label>Visited date</Label><Input name="visitedOn" type="date" /></label><label className="grid gap-1"><Label>Rating / 10</Label><Input name="rating" type="number" min="0" max="10" step="0.5" /></label><label className="grid gap-1"><Label>Category</Label><select name="category" defaultValue="other" className="h-11 rounded-2xl border bg-card px-3"><option value="nature">Nature</option><option value="restaurant">Restaurant</option><option value="tourist_attraction">Tourist attraction</option><option value="historical">Historical place</option><option value="other">Other</option></select></label></div><ImageGalleryField name="place-image" initialImages={[]} label="Photos" hint="Upload photos from the visit — the first one becomes its cover in the journal." /><label className="grid gap-1"><Label>Photo URLs <span className="text-muted-foreground">(optional)</span></Label><Input name="photoUrls" placeholder="https://… , https://…" /></label><label className="grid gap-1"><Label>Notes</Label><Textarea name="notes" /></label><label className="grid gap-1"><Label>Visit reflection</Label><Textarea name="reflection" placeholder="What made this visit special? Your partner can add their own reflection after you save." /></label><label className="flex items-start gap-3 rounded-2xl border border-primary/10 bg-secondary/40 px-4 py-3 text-sm"><input name="visitedTogether" type="checkbox" className="mt-1 size-4" /><span><strong>Visited together</strong><br /><span className="text-muted-foreground">Show this place in your partner&apos;s places list too, so they can share their own reflection.</span></span></label><label className="grid gap-1"><Label>Visibility</Label>{visibility}</label><Button disabled={pending}>{pending ? "Saving…" : "Add place"}</Button></form>;
}
