"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  email: string;
  name: string;
  onPreviewShape: (shape: string | null) => void;
};

export function MessagePill({ email, name, onPreviewShape }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    firstFieldRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        data-shape="message"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => onPreviewShape("message")}
        onMouseLeave={() => onPreviewShape(null)}
        onFocus={() => onPreviewShape("message")}
        onBlur={() => onPreviewShape(null)}
        className="rounded-full border border-line bg-bg px-4 py-2 text-sm shadow-sm transition-colors hover:border-fg"
      >
        Write to me
      </button>

      {open ? (
        <form
          role="dialog"
          aria-label="Write to me"
          className="pop-in absolute bottom-full right-0 mb-3 w-[min(20rem,calc(100vw-2.5rem))] rounded-xl border border-line bg-bg p-4 shadow-xl"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            const subject = encodeURIComponent(`Hello ${name}, from your site`);
            const body = encodeURIComponent(
              `${String(data.get("message") ?? "")}\n\n— ${String(data.get("name") ?? "")} (${
                String(data.get("email") ?? "") || "no email given"
              })`,
            );
            window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
            setOpen(false);
          }}
        >
          <p className="text-sm font-medium">Write to me</p>
          <p className="mt-1 text-xs text-muted">Opens a pre-filled email in your mail app.</p>
          <div className="mt-3 space-y-2">
            <label className="block">
              <span className="sr-only">Your name</span>
              <input
                ref={firstFieldRef}
                name="name"
                required
                placeholder="Your name"
                className="w-full rounded-md border border-line bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted focus:border-fg"
              />
            </label>
            <label className="block">
              <span className="sr-only">Your email</span>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full rounded-md border border-line bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted focus:border-fg"
              />
            </label>
            <label className="block">
              <span className="sr-only">Message</span>
              <textarea
                name="message"
                required
                rows={3}
                placeholder="Say hello…"
                className="w-full resize-none rounded-md border border-line bg-transparent px-2.5 py-1.5 text-sm outline-none placeholder:text-muted focus:border-fg"
              />
            </label>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                buttonRef.current?.focus();
              }}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-full border border-line px-3.5 py-1.5 text-sm transition-colors hover:border-fg"
            >
              Send
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
