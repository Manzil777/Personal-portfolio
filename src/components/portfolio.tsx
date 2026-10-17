"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { experience, life, projects, site, type IndexItem } from "@/data/site";
import { SignalCanvas } from "./signal-canvas";

const tabs = [
  { label: "Projects", items: projects },
  { label: "Experience", items: experience },
  { label: "Life", items: life },
];

export function Portfolio() {
  const [tab, setTab] = useState(0);
  const [selected, setSelected] = useState<IndexItem | null>(null);
  const id = useId();
  const current = tabs[tab];

  return (
    <div className="shell">
      <main id="main" className="home-grid" tabIndex={-1}>
        <section className="intro" aria-labelledby="home-title">
          <p className="eyebrow">Hello, I&apos;m</p>
          <h1 id="home-title">
            Manzil<span>.</span>
          </h1>
          <div className="bio">
            <p>
              I&apos;m an AI and Data Science student who builds end-to-end
              machine-learning systems, from data pipelines and model
              evaluation to useful interfaces.
            </p>
            <p className="desktop-only">
              I&apos;m interested in applied AI, data analysis, and software that
              turns raw information into decisions people can use.
            </p>
          </div>
          <ul className="socials">
            {site.socials.map((social) => (
              <li key={social.label}>
                <a href={social.href} target="_blank" rel="noreferrer">
                  {social.label}
                  <span aria-hidden="true">↗</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="visual" aria-label="Interactive project illustration">
          <SignalCanvas shape={selected?.shape ?? "idle"} />
        </section>

        <section className="index" aria-label="Portfolio index">
          <div role="tablist" aria-label="Portfolio categories" className="tabs">
            {tabs.map((item, index) => (
              <button
                key={item.label}
                id={`${id}-${index}`}
                role="tab"
                aria-selected={tab === index}
                aria-controls={`${id}-panel-${index}`}
                tabIndex={tab === index ? 0 : -1}
                onClick={() => {
                  setTab(index);
                  setSelected(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                    const next =
                      (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) %
                      tabs.length;
                    setTab(next);
                    setSelected(null);
                  }
                }}
              >
                {item.label}
                <sup>{String(item.items.length).padStart(2, "0")}</sup>
              </button>
            ))}
          </div>

          <ol
            id={`${id}-panel-${tab}`}
            role="tabpanel"
            aria-labelledby={`${id}-${tab}`}
            className="index-list"
          >
            {current.items.map((item, index) => (
              <li
                key={item.title}
                className={selected?.title === item.title ? "active" : ""}
                onMouseEnter={() => setSelected(item)}
                onFocus={() => setSelected(item)}
              >
                {"slug" in item ? (
                  <Link href={`/work/${item.slug}`} className="index-row">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{item.title}</b>
                    <em>{item.detail}</em>
                  </Link>
                ) : (
                  <button
                    className="index-row"
                    type="button"
                    onClick={() => setSelected(item)}
                  >
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <b>{item.title}</b>
                    <em>{item.detail}</em>
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer>
        <p className="hint" aria-live="polite">
          {selected
            ? selected.summary
            : "Select an item to see the field settle into its signal."}
        </p>
        <a
          className="contact"
          href={`mailto:${site.email}?subject=Hello%20Manzil`}
        >
          Write to me
        </a>
      </footer>
    </div>
  );
}
