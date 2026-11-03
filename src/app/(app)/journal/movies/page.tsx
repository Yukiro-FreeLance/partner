import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import { visibleMovieEntries } from "@/lib/services/journal";
import { contentBadge, entryContentType, entryImages, watchContentTypes } from "@/lib/watch";
import type { WatchContentType } from "@/lib/domain";

export const metadata = { title: "Movies" };

export default async function MoviesPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; type?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? "";
  const status = params.status;
  const type = params.type && watchContentTypes.includes(params.type as WatchContentType) ? params.type : "";
  const all = await visibleMovieEntries(await getRepository(), user.profile.id);
  const entries = all.filter((entry) => (!query || entry.title.toLowerCase().includes(query) || entry.genre.some((genre) => genre.toLowerCase().includes(query))) && (!status || entry.status === status) && (!type || entryContentType(entry.contentType) === type));
  return <main className="grid w-full gap-5 px-4 py-5 lg:px-8">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><Link href="/journal" className="text-sm underline">Journal</Link><h1 className="mt-2 font-serif text-4xl">Watch history</h1><p className="mt-2 text-sm text-muted-foreground">Movies, series, seasons, and episodes — your shared watch story, all in one place.</p></div><Link href="/journal/movies/new" className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground">Add entry</Link></header>
    <form className="panel grid gap-2 p-3 sm:grid-cols-[1fr_auto_auto]">
      <input name="q" defaultValue={params.q} placeholder="Search your watch history" className="h-11 rounded-2xl border bg-card px-3" />
      <select name="type" defaultValue={type} className="h-11 rounded-2xl border bg-card px-3"><option value="">All types</option><option value="movie">Movies</option><option value="series">TV series</option><option value="season">Seasons</option><option value="episode">Episodes</option><option value="other">Other</option></select>
      <select name="status" defaultValue={status ?? ""} className="h-11 rounded-2xl border bg-card px-3"><option value="">All statuses</option><option value="watched">Watched</option><option value="watching">Currently watching</option><option value="want_to_watch">Want to watch</option></select>
      <button className="rounded-full bg-secondary px-4 text-sm" type="submit">Filter</button>
    </form>
    {!entries.length ? <section className="panel p-10 text-center text-sm text-muted-foreground">Nothing matches your filters. <Link href="/journal/movies/new" className="text-primary underline">Add an entry</Link>.</section> : <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">{entries.map((entry) => <Link key={entry.id} href={`/journal/movies/${entry.id}`} className="group overflow-hidden rounded-2xl border bg-card p-2 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <div className="aspect-[2/3] overflow-hidden rounded-xl bg-secondary">{entry.posterUrl || entryImages(entry.images)[0] ? <img src={entry.posterUrl || entryImages(entry.images)[0]} alt="" className="h-full w-full object-cover transition group-hover:scale-105" /> : <div className="flex h-full items-center justify-center p-2 text-center text-xs text-primary">No cover</div>}</div>
      <p className="mt-2 truncate text-sm font-semibold">{entry.title}</p>
      <p className="text-[11px] font-medium uppercase tracking-wide text-primary">{contentBadge(entry)}</p>
      {(entry.userId !== user.profile.id || entry.watchedTogether) && <p className="mt-0.5 w-fit rounded-full bg-accent px-2 text-[10px] font-semibold uppercase tracking-wide text-primary">{entry.userId !== user.profile.id ? "Watched together by partner" : "Watched together"}</p>}
      <p className="truncate text-xs text-muted-foreground">{[entry.releaseYear, entry.status.replaceAll("_", " ")].filter(Boolean).join(" · ")}</p>
      {entry.rating != null && <p className="mt-1 text-xs text-primary">★ {entry.rating}/10</p>}
    </Link>)}</section>}
  </main>;
}
