"use client";

import { useCallback, useSyncExternalStore } from "react";

const KEY = "manzil-ui-theme";

type Resolved = "light" | "dark";

const listeners = new Set<() => void>();

function notify() {
  for (const listener of listeners) listener();
}

function stored(): Resolved | null {
  try {
    const value = localStorage.getItem(KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    /* ignore */
  }
  return null;
}

function resolve(): Resolved {
  return stored() ?? "dark";
}

function apply(theme: Resolved) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", notify);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", notify);
  };
}

const getSnapshot = (): Resolved => resolve();
const getServerSnapshot = (): Resolved => "dark";

function SunIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      color="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M17 12C17 14.7614 14.7614 17 12 17C9.23858 17 7 14.7614 7 12C7 9.23858 9.23858 7 12 7C14.7614 7 17 9.23858 17 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 2V3.5M12 20.5V22M19.0708 19.0713L18.0101 18.0106M5.98926 5.98926L4.9286 4.9286M22 12H20.5M3.5 12H2M19.0713 4.92871L18.0106 5.98937M5.98975 18.0107L4.92909 19.0714"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      color="currentColor"
      aria-hidden="true"
    >
      <path
        d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next: Resolved = theme === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    notify();
  }, [theme]);

  const isDark = theme !== "light";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      className="grid size-9 place-items-center rounded-full border border-line text-muted transition-colors hover:text-fg"
    >
      <span className="hidden dark:block">
        <SunIcon />
      </span>
      <span className="block dark:hidden">
        <MoonIcon />
      </span>
    </button>
  );
}
