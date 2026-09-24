import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-5 py-24 sm:px-8">
      <div>
        <h1 className="font-serif text-4xl tracking-tight">Greek Bible Teacher</h1>
        <p className="mt-2 text-muted">Learn to read the Greek New Testament.</p>
      </div>
      <nav className="flex gap-3 text-sm">
        <Link href="/read" className="rounded-full bg-ink px-5 py-2 text-paper hover:opacity-90">
          Start reading
        </Link>
        <Link
          href="/about"
          className="rounded-full border border-rule px-5 py-2 hover:bg-accent-soft"
        >
          Sources
        </Link>
      </nav>
    </main>
  );
}
