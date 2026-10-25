import { Skeleton } from "@/components/ui/feedback";

export default function QuizLoading() {
  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-xl gap-4 px-4 py-5" aria-busy="true">
      <p className="sr-only" role="status">Loading this question</p>
      <Skeleton className="h-2 rounded-full" />
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-64 rounded-[1.75rem]" />
      <div className="grid gap-3">
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-12 rounded-full" />
        <Skeleton className="h-12 rounded-full" />
      </div>
    </main>
  );
}
