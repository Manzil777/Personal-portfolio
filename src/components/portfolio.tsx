"use client";

import { useCallback, useId, useState } from "react";
import { site, socials, tabs, type Row } from "@/data/site";
import { MessagePill } from "./message-pill";
import { ParticleField } from "./particle-field";
import { ThemeToggle } from "./theme-toggle";

export function Portfolio() {
  const id = useId();
  const [tab, setTab] = useState(0);
  const [pinned, setPinned] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const shape = preview ?? pinned ?? site.restShape;
  const tagline = summary ?? site.tagline;

  const enter = useCallback((key: string, text?: string) => {
    setPreview(key);
    setSummary(text ?? null);
  }, []);

  const leave = useCallback(() => {
    setPreview(null);
    setSummary(null);
  }, []);

  const selectTab = useCallback((index: number) => {
    setTab(index);
    setPinned(null);
    setPreview(null);
    setSummary(null);
  }, []);

  const togglePin = useCallback((key: string) => {
    setPinned((current) => (current === key ? null : key));
  }, []);

  const onTabKeys = (event: React.KeyboardEvent) => {
    const last = tabs.length - 1;
    let next: number | null = null;
    if (event.key === "ArrowRight") next = (tab + 1) % tabs.length;
    else if (event.key === "ArrowLeft") next = (tab - 1 + tabs.length) % tabs.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    if (next === null) return;
    event.preventDefault();
    selectTab(next);
    document.getElementById(`${id}-tab-${next}`)?.focus();
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: "Manzil Shrestha",
    alternateName: site.name,
    url: site.url,
    jobTitle: site.role,
    description: site.description,
    address: { "@type": "PostalAddress", addressLocality: site.location },
    knowsAbout: [
      "Machine Learning",
      "Data Science",
      "PyTorch",
      "Natural Language Processing",
      "MLOps",
    ],
    sameAs: socials.filter((s) => s.href.startsWith("http")).map((s) => s.href),
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-[1920px] flex-col px-5 py-6 sm:px-10 lg:px-16">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <header className="absolute right-5 top-6 flex justify-end sm:right-10 lg:static">
        <ThemeToggle />
      </header>

      <main
        id="main"
        className="grid flex-1 content-start items-center gap-8 pb-10 lg:content-center lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:gap-10 lg:py-10"
      >
        <section className="max-w-sm">
          <p className="text-sm text-muted">Hi, I&rsquo;m</p>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
            {site.heading}.
          </h1>
          <div className="mt-3 space-y-4 text-sm leading-normal text-muted lg:mt-6 lg:text-[15px] lg:leading-relaxed">
            <p>{site.bio[0]}</p>
            <p className="hidden lg:block">{site.bio[1]}</p>
          </div>
          <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm lg:mt-6">
            {socials.map((social) => (
              <li key={social.label}>
                <a
                  href={social.href}
                  data-shape={social.shape}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => enter(social.shape)}
                  onMouseLeave={leave}
                  onFocus={() => enter(social.shape)}
                  onBlur={leave}
                  className="border-b border-line pb-0.5 transition-colors hover:border-fg"
                >
                  {social.label}
                  <span aria-hidden="true" className="ml-0.5 text-muted">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <div
          aria-hidden="true"
          className="h-72 w-full sm:h-96 lg:aspect-square lg:h-auto lg:w-[min(48rem,calc(100dvh-13rem),calc(100vw-44.5rem))] lg:max-w-full lg:justify-self-center"
        >
          <ParticleField shape={shape} className="h-full w-full" />
        </div>

        <section className="w-full max-w-md lg:justify-self-end">
          <div>
            <div
              role="tablist"
              aria-label="Lists"
              className="flex gap-6 border-b border-line"
              onKeyDown={onTabKeys}
            >
              {tabs.map((item, index) => {
                const selected = tab === index;
                return (
                  <button
                    key={item.label}
                    id={`${id}-tab-${index}`}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`${id}-panel-${index}`}
                    tabIndex={selected ? 0 : -1}
                    onClick={() => selectTab(index)}
                    className={`-mb-px border-b pb-2.5 text-sm transition-colors ${
                      selected
                        ? "border-fg text-fg"
                        : "border-transparent text-muted hover:text-fg"
                    }`}
                  >
                    {item.label}
                    <sup className="ml-0.5 text-[10px] tabular-nums text-muted">
                      {String(item.rows.length).padStart(2, "0")}
                    </sup>
                  </button>
                );
              })}
            </div>

            <div className="grid">
              {tabs.map((item, index) => {
                const active = tab === index;
                return (
                  <div
                    key={item.label}
                    id={`${id}-panel-${index}`}
                    role="tabpanel"
                    aria-labelledby={`${id}-tab-${index}`}
                    inert={!active}
                    className={`grid grid-cols-2 content-start gap-x-4 [grid-area:1/1] lg:block ${
                      active ? "" : "invisible"
                    }`}
                  >
                    <ul className="contents">
                      {item.rows.map((row, rowIndex) => (
                        <RowItem
                          key={`${row.shape}-${rowIndex}`}
                          row={row}
                          index={rowIndex}
                          pinned={pinned === row.shape}
                          onEnter={enter}
                          onLeave={leave}
                          onActivate={togglePin}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative flex items-center justify-end">
        <p
          aria-live="polite"
          className="absolute left-1/2 hidden -translate-x-1/2 whitespace-nowrap text-sm text-muted lg:block"
        >
          <span key={tagline} className="tagline-in inline-block">
            {tagline}
          </span>
        </p>
        <MessagePill
          email={site.email}
          name={site.name}
          onPreviewShape={(key) => {
            if (key) setPreview(key);
            else setPreview(null);
          }}
        />
      </footer>
    </div>
  );
}

type RowProps = {
  row: Row;
  index: number;
  pinned: boolean;
  onEnter: (key: string, text?: string) => void;
  onLeave: () => void;
  onActivate: (key: string) => void;
};

function RowItem({ row, index, pinned, onEnter, onLeave, onActivate }: RowProps) {
  const inner = (
    <>
      <span className="w-6 shrink-0 text-xs tabular-nums text-muted">
        {String(index + 1).padStart(2, "0")}
      </span>
      <span className="min-w-0 truncate transition-colors group-data-[pinned]:text-accent group-hover:text-accent group-focus-within:text-accent lg:shrink-0 lg:overflow-visible">
        {row.title}
      </span>
      {row.detail ? (
        <span className="hidden min-w-0 flex-1 truncate text-right text-xs text-muted lg:block">
          {row.detail}
        </span>
      ) : null}
    </>
  );

  const shared = {
    "data-shape": row.shape,
    "data-summary": row.summary,
    "data-title": row.title,
    onMouseEnter: () => onEnter(row.shape, row.summary),
    onMouseLeave: onLeave,
    onFocus: () => onEnter(row.shape, row.summary),
    onBlur: onLeave,
    onClick: () => onActivate(row.shape),
    className:
      "flex w-full items-baseline gap-2.5 border-b border-line py-2 text-left transition-colors hover:text-muted lg:gap-4 lg:py-3",
  };

  return (
    <li className="group" data-pinned={pinned ? "" : undefined}>
      {row.href ? (
        <a href={row.href} target="_blank" rel="noopener noreferrer" {...shared}>
          {inner}
        </a>
      ) : (
        <button type="button" {...shared}>
          {inner}
        </button>
      )}
    </li>
  );
}
