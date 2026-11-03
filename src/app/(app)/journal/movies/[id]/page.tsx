import Link from "next/link";
import { notFound } from "next/navigation";
import { deleteMovieAction, deleteReflectionAction } from "@/app/actions";
import { MovieForm, ReflectionForm } from "@/components/journal-forms";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { Repository } from "@/lib/data/repository";
import type { MovieEntry } from "@/lib/domain";
import { visibleMovie } from "@/lib/services/journal";
import { contentBadge, entryContentType, entryImages } from "@/lib/watch";

export const metadata = { title: "Watch journal" };

export default async function WatchEntryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const repo = await getRepository();
  const entry = await visibleMovie(repo, user.profile.id, id);
  if (!entry) notFound();
  const ownsEntry = entry.userId === user.profile.id;
  const type = entryContentType(entry.contentType);
  const [ownRows, childRows, seriesRow, reflections] = await Promise.all([
    repo.list("movieEntries", { eq: { userId: user.profile.id } }, { orderBy: "updatedAt", descending: true }),
    (type === "season" ? entry.seriesId : id) ? repo.list("movieEntries", { eq: { seriesId: type === "season" ? (entry.seriesId ?? id) : id } }, { orderBy: "updatedAt", descending: true }) : Promise.resolve([]),
    entry.seriesId ? repo.find("movieEntries", { eq: { id: entry.seriesId } }) : Promise.resolve(null),
    repo.list("movieReflections", { eq: { movieId: id } }, { orderBy: "createdAt", descending: true }),
  ]);
  const profiles = await profilesFor(repo, [entry.userId, ...reflections.map((reflection) => reflection.userId)]);
  const rows = ownRows.some((row) => row.id === entry.id) ? ownRows : [entry, ...ownRows];

  const cover = entry.posterUrl || entryImages(entry.images)[0] || null;
  const gallery = entryImages(entry.images).filter((url) => url !== cover);
  const children = childRows.filter((row) => row.userId === entry.userId);
  const seasons = children.filter((row) => entryContentType(row.contentType) === "season").sort((a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0));
  const episodes = children.filter((row) => entryContentType(row.contentType) === "episode").sort((a, b) => (a.seasonNumber ?? 0) - (b.seasonNumber ?? 0) || (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0));
  const seasonEpisodes = type === "season" ? children.filter((row) => entryContentType(row.contentType) === "episode" && row.seasonNumber === entry.seasonNumber).sort((a, b) => (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)) : [];
  const seriesOptions = ownRows.filter((row) => entryContentType(row.contentType) === "series").map((row) => ({ id: row.id, title: row.title }));
  const reflectionLabel = type === "season" ? "Season reflection" : type === "episode" ? "Episode reflection" : type === "series" ? "Series reflection" : "Reflection";
  const reflectionIntro = type === "season" ? "Capture what this season meant to you." : type === "episode" ? "Capture what this episode meant to you." : type === "series" ? "Capture what this show meant to you." : "Capture what it meant to you.";
  const sharedNote = ownsEntry ? entry.watchedTogether : true;

  return <main className="grid w-full gap-4 px-4 py-5 lg:px-8">
    <Link href="/journal/movies" className="text-sm underline">Back to watch history</Link>
    <div className="grid items-start gap-4 lg:grid-cols-[220px_minmax(300px,0.9fr)_minmax(360px,1.25fr)]">
      <aside className="panel order-2 p-4 lg:order-1 lg:sticky lg:top-24">
        <div className="flex items-center justify-between gap-2"><h2 className="font-serif text-2xl">Watch list</h2><Link href="/journal/movies/new" className="text-xs underline">Add</Link></div>
        <div className="mt-4 grid max-h-[calc(100dvh-12rem)] gap-2 overflow-y-auto pr-1">{rows.map((row) => <Link key={row.id} href={`/journal/movies/${row.id}`} className={`flex gap-2 rounded-xl p-2 ${row.id === entry.id ? "bg-accent" : "hover:bg-secondary"}`}><span className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-secondary">{row.posterUrl || entryImages(row.images)[0] ? <img src={row.posterUrl || entryImages(row.images)[0]} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[9px] text-muted-foreground">No cover</span>}</span><span className="min-w-0"><strong className="block truncate text-xs">{row.title}</strong><span className="text-[11px] capitalize text-muted-foreground">{contentBadge(row)}{row.userId !== user.profile.id ? " · together" : ""}</span></span></Link>)}</div>
      </aside>
      <section className="panel order-1 p-5 lg:order-2">
        <div className="grid gap-4">
          <div className="aspect-[2/3] max-h-[420px] overflow-hidden rounded-2xl bg-secondary">{cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-primary">No cover</div>}</div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{contentBadge(entry)}</p>
            <h1 className="mt-1 font-serif text-4xl leading-tight">{entry.title}</h1>
            <p className="mt-2 text-sm text-muted-foreground">{[[entry.seasonNumber != null && type !== "season" ? `S${entry.seasonNumber}` : null, entry.episodeNumber != null ? `E${entry.episodeNumber}` : null].filter(Boolean).join(" · "), entry.releaseYear, entry.director, entry.durationMinutes ? `${entry.durationMinutes} min` : null].filter(Boolean).join(" · ") || "Watch details"}</p>
            {seriesRow && <p className="mt-3 rounded-2xl bg-secondary/60 px-3 py-2 text-sm"><span className="text-muted-foreground">Part of</span> <Link href={`/journal/movies/${seriesRow.id}`} className="font-medium underline">{seriesRow.title}</Link></p>}
            {!ownsEntry && <p className="mt-3 rounded-2xl bg-accent px-3 py-2 text-sm text-primary">Watched together — shared by {profileName(profiles, entry.userId)}. You can add your own reflection on the right.</p>}
            <div className="mt-4 grid gap-2 rounded-2xl bg-secondary p-4 text-sm">
              <p>Status <strong className="float-right capitalize">{entry.status.replaceAll("_", " ")}</strong></p>
              {entry.rating != null && <p>Rating <strong className="float-right">{entry.rating}/10</strong></p>}
              {entry.seasonNumber != null && <p>Season <strong className="float-right">{entry.seasonNumber}</strong></p>}
              {entry.episodeNumber != null && <p>Episode <strong className="float-right">{entry.episodeNumber}</strong></p>}
              {entry.watchedWith && <p>Watched with <strong className="float-right">{entry.watchedWith}</strong></p>}
              {entry.mood && <p>Mood <strong className="float-right">{entry.mood}</strong></p>}
              {entry.genre.length > 0 && <p>Genres <span className="float-right max-w-[65%] text-right text-muted-foreground">{entry.genre.join(", ")}</span></p>}
              <p>Visibility <strong className="float-right">{entry.visibility === "partner" ? "Shared with partner" : entry.visibility}</strong></p>
              {sharedNote && <p className="text-primary">Watched together — your partner can also reflect on this.</p>}
            </div>
          </div>
          {gallery.length > 0 && <div className="grid gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{type === "season" ? "Season gallery" : type === "episode" ? "Episode gallery" : "Gallery"}</h2>
            <div className="grid grid-cols-3 gap-2">{gallery.map((url) => <span key={url} className="aspect-[3/4] overflow-hidden rounded-xl bg-secondary"><img src={url} alt="" className="h-full w-full object-cover transition hover:scale-105" /></span>)}</div>
          </div>}
        </div>
        {ownsEntry && type === "series" && <div className="mt-6 grid gap-4 border-t pt-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-2xl">Seasons &amp; episodes</h2>
            <div className="flex gap-2">
              <Link href={`/journal/movies/new?type=season&series=${entry.id}`} className="rounded-full bg-secondary px-3 py-1.5 text-sm">+ Season</Link>
              <Link href={`/journal/movies/new?type=episode&series=${entry.id}`} className="rounded-full bg-secondary px-3 py-1.5 text-sm">+ Episode</Link>
            </div>
          </div>
          {seasons.length > 0 && <div className="grid gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seasons</p>{seasons.map((row) => childRow(row))}</div>}
          {episodes.length > 0 && <div className="grid gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Episodes</p>{episodes.map((row) => childRow(row))}</div>}
          {seasons.length === 0 && episodes.length === 0 && <p className="rounded-2xl bg-secondary p-4 text-sm text-muted-foreground">No seasons or episodes yet. Use the buttons above to organize {entry.title} — each one gets its own images and reflection.</p>}
        </div>}
        {ownsEntry && type === "season" && seasonEpisodes.length > 0 && <div className="mt-6 grid gap-2 border-t pt-5">
          <h2 className="font-serif text-2xl">Episodes in this season</h2>
          {seasonEpisodes.map((row) => childRow(row))}
        </div>}
        {ownsEntry && <details className="mt-6 rounded-2xl border p-4">
          <summary className="cursor-pointer font-medium">Edit details</summary>
          <div className="mt-4"><MovieForm movie={entry} seriesOptions={seriesOptions} /></div>
        </details>}
        {ownsEntry && <form action={deleteMovieAction} className="mt-4">
          <input type="hidden" name="movieId" value={entry.id} />
          <Button type="submit" variant="destructive">{type === "series" ? "Delete series & its entries" : "Delete entry"}</Button>
        </form>}
      </section>
      <section className="panel order-3 p-5 lg:order-3">
        <div>
          <h2 className="font-serif text-3xl">Reflections</h2>
          <p className="mt-1 text-sm text-muted-foreground">{reflectionIntro}{!ownsEntry ? " Yours joins the ones your partner already wrote." : ""}</p>
        </div>
        <div className="mt-5 rounded-2xl bg-secondary/60 p-4"><ReflectionForm movieId={entry.id} label={reflectionLabel} /></div>
        <div className="mt-6 grid gap-3">{reflections.length === 0 ? <p className="rounded-2xl border p-4 text-sm text-muted-foreground">No reflections yet. Start with what stayed with you.</p> : reflections.map((reflection) => <article key={reflection.id} className="rounded-2xl border p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground">{reflection.createdAt.slice(0, 10)}{reflection.userId === user.profile.id ? " · you" : ` · ${profileName(profiles, reflection.userId)}`}</p>
            {reflection.userId === user.profile.id && <form action={deleteReflectionAction}><input type="hidden" name="reflectionId" value={reflection.id} /><input type="hidden" name="movieId" value={entry.id} /><Button type="submit" variant="ghost" size="sm">Delete</Button></form>}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reflection.body}</p>
          {entryImages(reflection.imageUrls).length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{entryImages(reflection.imageUrls).map((url) => <span key={url} className="aspect-[3/4] overflow-hidden rounded-lg bg-secondary"><img src={url} alt="" className="h-full w-full object-cover" /></span>)}</div>}
          {reflection.learned && <p className="mt-3 text-xs text-muted-foreground"><strong>Learned:</strong> {reflection.learned}</p>}
          {reflection.memorableScene && <p className="mt-2 text-xs text-muted-foreground"><strong>Memorable scene:</strong> {reflection.memorableScene}</p>}
        </article>)}</div>
      </section>
    </div>
  </main>;
}

async function profilesFor(repo: Repository, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (!unique.length) return [];
  return repo.list("profiles", { in: { id: unique } }).catch(() => []);
}

function profileName(profiles: Awaited<ReturnType<typeof profilesFor>>, userId: string) {
  return profiles.find((profile) => profile.id === userId)?.displayName ?? "Your partner";
}

function childRow(row: MovieEntry) {
  const cover = row.posterUrl || entryImages(row.images)[0];
  return <Link key={row.id} href={`/journal/movies/${row.id}`} className="flex items-center gap-3 rounded-2xl border p-2 transition hover:border-primary/20 hover:bg-secondary">
    <span className="h-14 w-10 shrink-0 overflow-hidden rounded-lg bg-secondary">{cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center text-[10px] text-muted-foreground">No cover</span>}</span>
    <span className="min-w-0 flex-1">
      <strong className="block truncate text-sm">{row.title}</strong>
      <span className="text-xs capitalize text-muted-foreground">{contentBadge(row)}{row.rating != null ? ` · ${row.rating}/10` : ""}</span>
    </span>
    <span className="text-xs text-primary">Open</span>
  </Link>;
}
