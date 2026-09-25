import { Skeleton } from "@/components/ui/skeleton";

const LINES = ["w-11/12", "w-4/5", "w-full", "w-3/5", "w-11/12", "w-2/3", "w-5/6", "w-3/4"];

/**
 * The reader's shape while a passage loads: its header, the book title, listen button and text
 * lines, and (on wider screens) the empty word panel.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading the passage" className="md:mr-[360px] xl:mr-[440px]">
      <div className="pt-[env(safe-area-inset-top)] md:border-b md:border-border">
        <div className="flex h-14 items-center justify-between pr-3 pl-2 md:h-[72px] md:px-8">
          <div className="flex items-center gap-3">
            <Skeleton className="ml-2 size-6" />
            <Skeleton className="hidden h-6 w-20 md:block" />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-2.5 w-14" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="hidden h-10 w-32 rounded-[10px] md:block" />
          </div>
        </div>
        <Skeleton className="mx-5 h-0.5 md:hidden" />
      </div>
      <div className="mx-auto max-w-[640px] pt-5 pr-6 pl-1.5 md:px-0 md:pt-[72px]">
        <Skeleton className="mx-auto h-3 w-36" />
        <Skeleton className="mx-auto mt-3 hidden h-14 w-10 md:block" />
        <div className="mt-[18px] pl-7 md:mt-7 md:pl-10">
          <Skeleton className="h-9 w-40 rounded-full" />
          <div className="mt-6 space-y-5">
            {LINES.map((w, i) => (
              <Skeleton key={i} className={`h-6 ${w}`} />
            ))}
          </div>
        </div>
      </div>
      <div className="fixed top-0 right-0 bottom-0 hidden w-[360px] border-l border-border bg-card px-8 pt-10 md:block xl:w-[440px] xl:px-9">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="mt-5 h-6 w-4/5" />
        <Skeleton className="mt-2 h-6 w-3/5" />
      </div>
    </div>
  );
}
