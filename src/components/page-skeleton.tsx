import { Skeleton } from "@/components/ui/feedback";

function Status({ label }: { label: string }) {
  return <p className="sr-only" role="status">{label}</p>;
}

export function HomeSkeleton() {
  return (
    <main className="grid w-full gap-4 px-4 py-4 lg:px-8 lg:py-6" aria-busy="true">
      <Status label="Loading home" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:items-start">
        <div className="grid gap-4">
          <Skeleton className="min-h-72 rounded-[2rem]" />
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="min-h-36 rounded-[1.75rem]" />)}
          </div>
          <div className="hidden gap-4 lg:grid lg:grid-cols-2">
            <Skeleton className="h-52 rounded-[1.75rem]" />
            <Skeleton className="h-52 rounded-[1.75rem]" />
          </div>
        </div>
        <div className="grid gap-4">
          <Skeleton className="h-72 rounded-[1.75rem]" />
          <Skeleton className="h-44 rounded-[1.75rem]" />
          <Skeleton className="h-56 rounded-[1.75rem]" />
        </div>
      </div>
    </main>
  );
}

export function CardsSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <main className="grid w-full gap-4 px-4 py-5 lg:px-8" aria-busy="true">
      <Status label={label} />
      <Skeleton className="h-10 w-56" />
      <Skeleton className="h-5 w-full max-w-xl" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-40 rounded-[1.75rem]" />)}
      </div>
    </main>
  );
}

export function ProfileSkeleton() {
  return (
    <main className="w-full" aria-busy="true">
      <Status label="Loading profile" />
      <Skeleton className="h-56 rounded-none" />
      <div className="grid w-full items-start gap-6 px-4 py-6 xl:grid-cols-[minmax(0,1fr)_22rem] xl:px-8">
        <div className="grid gap-4">
          <Skeleton className="h-16 w-64" />
          <Skeleton className="h-80 rounded-[1.75rem]" />
        </div>
        <Skeleton className="h-80 rounded-[1.75rem]" />
      </div>
    </main>
  );
}

export function SettingsSkeleton() {
  return (
    <main className="grid w-full gap-6 px-4 py-6 lg:px-8 lg:py-8" aria-busy="true">
      <Status label="Loading settings" />
      <Skeleton className="h-10 w-48" />
      <div className="grid items-start gap-6 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <Skeleton className="h-72 rounded-[1.75rem]" />
        <Skeleton className="h-96 rounded-[1.75rem]" />
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-3">
        <Skeleton className="h-56 rounded-[1.75rem]" />
        <Skeleton className="h-56 rounded-[1.75rem]" />
        <Skeleton className="h-56 rounded-[1.75rem]" />
      </div>
    </main>
  );
}

export function SplitSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <main className="grid w-full items-start gap-6 px-4 py-6 lg:grid-cols-2 lg:px-8" aria-busy="true">
      <Status label={label} />
      <Skeleton className="h-80 rounded-[1.75rem]" />
      <Skeleton className="h-80 rounded-[1.75rem]" />
    </main>
  );
}

export function ListSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <main className="mx-auto grid w-full max-w-3xl gap-4 px-4 py-6" aria-busy="true">
      <Status label={label} />
      <Skeleton className="h-10 w-48" />
      {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-[1.75rem]" />)}
    </main>
  );
}

export function CycleSkeleton() {
  return (
    <div className="grid gap-4" aria-busy="true">
      <Status label="Loading your cycle tracker" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 xl:grid-cols-[20rem_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-[1.75rem]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-28 rounded-[1.75rem]" />)}
        </div>
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <Skeleton className="h-72 rounded-[1.75rem]" />
        <Skeleton className="h-72 rounded-[1.75rem]" />
      </div>
    </div>
  );
}

export function PageSkeleton() {
  return <CardsSkeleton label="Loading" />;
}
