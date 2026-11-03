import Link from "next/link";
import { notFound } from "next/navigation";
import { deletePlaceAction, deletePlaceReflectionAction } from "@/app/actions";
import { PlaceReflectionForm } from "@/components/journal-forms";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data";
import type { Repository } from "@/lib/data/repository";
import { visiblePlace } from "@/lib/services/journal";
import { entryImages } from "@/lib/watch";
export const metadata = { title: "Visited place" };

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const repo = await getRepository();
  const place = await visiblePlace(repo, user.profile.id, id);
  if (!place) notFound();
  const ownsPlace = place.userId === user.profile.id;
  const [reflections] = await Promise.all([
    repo.list("placeReflections", { eq: { placeId: id } }, { orderBy: "createdAt", descending: true }),
  ]);
  const profiles = await profilesFor(repo, [place.userId, ...reflections.map((reflection) => reflection.userId)]);
  const photos = entryImages(place.photoUrls);
  return <main className="mx-auto max-w-2xl px-4 py-6">
    <Link href="/journal/places" className="text-sm underline">Back to places</Link>
    <section className="panel mt-4 p-5">
      {!ownsPlace && <p className="mb-3 rounded-2xl bg-accent px-3 py-2 text-sm text-primary">Visited together — shared by {profileName(profiles, place.userId)}. You can add your own reflection below.</p>}
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{place.visitedOn ?? "Date not set"} · {place.category.replaceAll("_", " ")}</p>
      <h1 className="mt-2 font-serif text-4xl">{place.name}</h1>
      {place.address && <p className="mt-2 text-sm text-muted-foreground">{place.address}</p>}
      {photos.length > 0 && <div className="mt-4 grid grid-cols-3 gap-2">{photos.map((url, index) => <span key={`${url}-${index}`} className="aspect-[4/3] overflow-hidden rounded-xl bg-secondary"><img src={url} alt="" className="h-full w-full object-cover" /></span>)}</div>}
      {place.rating != null && <p className="mt-3 text-sm">Rated {place.rating}/10</p>}
      {place.notes && <p className="mt-5 whitespace-pre-wrap leading-7">{place.notes}</p>}
      {place.reflection && <blockquote className="mt-5 border-l-2 border-primary pl-4 italic leading-7">{place.reflection}</blockquote>}
      {place.latitude != null && place.longitude != null && <a className="mt-5 inline-block text-sm underline" target="_blank" rel="noreferrer" href={`https://www.openstreetmap.org/?mlat=${place.latitude}&mlon=${place.longitude}#map=16/${place.latitude}/${place.longitude}`}>Open location map</a>}
      {place.visitedTogether && <p className="mt-4 rounded-2xl bg-secondary px-3 py-2 text-sm text-muted-foreground">Visited together — both of you can keep reflections here.{ownsPlace ? " Your partner sees this place in their list too." : ""}</p>}
      <form action={deletePlaceAction} className="mt-6"><input type="hidden" name="placeId" value={place.id} /><Button variant="destructive" type="submit">Delete place</Button></form>
    </section>
    <section className="panel mt-4 grid gap-4 p-5">
      <div>
        <h2 className="font-serif text-3xl">Reflections</h2>
        <p className="mt-1 text-sm text-muted-foreground">What this place left with you{ownsPlace ? "" : `, plus ${profileName(profiles, place.userId)}'s side of the visit`}.</p>
      </div>
      <div className="rounded-2xl bg-secondary/60 p-4"><PlaceReflectionForm placeId={place.id} /></div>
      <div className="grid gap-3">{reflections.length === 0 ? <p className="rounded-2xl border p-4 text-sm text-muted-foreground">No reflections yet. Start with what stayed with you.</p> : reflections.map((reflection) => <article key={reflection.id} className="rounded-2xl border p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs text-muted-foreground">{reflection.createdAt.slice(0, 10)}{reflection.userId === user.profile.id ? " · you" : ` · ${profileName(profiles, reflection.userId)}`}</p>
          {reflection.userId === user.profile.id && <form action={deletePlaceReflectionAction}><input type="hidden" name="placeId" value={place.id} /><input type="hidden" name="placeReflectionId" value={reflection.id} /><Button type="submit" variant="ghost" size="sm">Delete</Button></form>}
        </div>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{reflection.body}</p>
        {entryImages(reflection.imageUrls).length > 0 && <div className="mt-3 grid grid-cols-4 gap-2">{entryImages(reflection.imageUrls).map((url) => <span key={url} className="aspect-[3/4] overflow-hidden rounded-lg bg-secondary"><img src={url} alt="" className="h-full w-full object-cover" /></span>)}</div>}
      </article>)}</div>
    </section>
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
