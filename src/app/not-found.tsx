import Link from "next/link";
import { ParticleField } from "@/components/particle-field";
import { ThemeToggle } from "@/components/theme-toggle";

export default function NotFound() {
  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[1600px] flex-col px-5 py-6 sm:px-10 lg:px-16">
      <header className="flex justify-end">
        <ThemeToggle />
      </header>
      <main className="flex flex-1 flex-col items-center justify-center pb-10 text-center">
        <ParticleField shape="broken-link" className="aspect-square w-full max-w-md" />
        <p className="text-sm text-muted">404</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-5xl">
          Lost the signal.
        </h1>
        <p className="mt-3 text-[15px] text-muted">
          This link&rsquo;s broken, or the page has moved on.
        </p>
        <Link
          href="/"
          data-shape="portrait"
          className="mt-6 border-b border-line pb-0.5 text-sm transition-colors hover:border-fg"
        >
          Back home
        </Link>
      </main>
    </div>
  );
}
