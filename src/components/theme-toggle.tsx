"use client";

import { useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(true);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("manzil-portfolio-theme", next ? "dark" : "light");
  }
  return <button className="theme-toggle" type="button" onClick={toggle} aria-label={`Switch to ${dark ? "light" : "dark"} theme`}>
    <span aria-hidden="true">{dark ? "☼" : "◐"}</span>
  </button>;
}
