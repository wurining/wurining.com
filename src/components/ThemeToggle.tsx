import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.body.classList.contains("dark")); }, []);

  function toggleTheme() {
    const next = document.body.classList.toggle("dark");
    setDark(next);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", next ? "#16191d" : "#ffffff");
    try { localStorage.setItem("pref-theme", next ? "dark" : "light"); } catch {}
  }

  return (
    <Button variant="unstyled" type="button" id="theme-toggle" accessKey="t" title={dark ? "Use light theme (Alt + T)" : "Use dark theme (Alt + T)"} aria-label={dark ? "Use light theme" : "Use dark theme"} aria-pressed={dark} onClick={toggleTheme}>
      <svg id="moon" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
      <svg id="sun" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    </Button>
  );
}
