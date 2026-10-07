import { useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";

export interface SearchItem { title: string; permalink: string; summary: string; content: string; }
interface Props { items: SearchItem[]; placeholder: string; }

export default function Search({ items, placeholder }: Props) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const input = useRef<HTMLInputElement>(null);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);
  const engine = useMemo(() => new Fuse(items, {
    isCaseSensitive: false, shouldSort: true, location: 0, distance: 1000,
    threshold: 0.4, minMatchCharLength: 0, ignoreLocation: true,
    keys: ["title", "permalink", "summary", "content"],
  }), [items]);
  const results = query.trim() ? engine.search(query.trim()).map((result) => result.item) : [];

  function reset() { setQuery(""); setActive(-1); input.current?.focus(); }
  function focusResult(index: number) {
    setActive(index);
    if (index < 0) input.current?.focus();
    else links.current[index]?.focus();
  }

  return (
    <div id="searchbox" onKeyDown={(event) => {
      if (event.key === "Escape") { event.preventDefault(); reset(); }
      if (!results.length) return;
      if (event.key === "ArrowDown") { event.preventDefault(); focusResult(Math.min(active + 1, results.length - 1)); }
      if (event.key === "ArrowUp") { event.preventDefault(); focusResult(Math.max(active - 1, -1)); }
      if (event.key === "ArrowRight" && active >= 0) links.current[active]?.click();
    }}>
      <input ref={input} id="searchInput" autoFocus placeholder={placeholder} aria-label="search" type="search" autoComplete="off" maxLength={64} value={query}
        onChange={(event) => { setQuery(event.target.value); setActive(-1); }} onFocus={() => setActive(-1)} />
      <ul id="searchResults" aria-label="search results">
        {results.map((item, index) => <li key={item.permalink} className={`post-entry${active === index ? " focus" : ""}`}>
          <header className="entry-header">{item.title}&nbsp;»</header>
          <a ref={(element) => { links.current[index] = element; }} href={item.permalink} aria-label={item.title} onFocus={() => setActive(index)} />
        </li>)}
      </ul>
    </div>
  );
}
