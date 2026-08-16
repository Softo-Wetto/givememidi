"use client";

import { Loader2, Music2, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { pocketbase } from "../../lib/pocketbaseClient";

type SearchSuggestion = {
  id: string;
  title: string;
  composer: string | null;
  genre: string | null;
};

export function HeaderSearch({ onNavigate }: { onNavigate?: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);

  useEffect(() => {
    const focusSearch = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      if ((event.target as HTMLElement | null)?.closest("input, textarea, select, [contenteditable='true']")) return;
      event.preventDefault();
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", focusSearch);
    return () => window.removeEventListener("keydown", focusSearch);
  }, []);

  useEffect(() => {
    const value = query.trim();
    let cancelled = false;

    const timer = window.setTimeout(async () => {
      if (value.length < 2) {
        setSuggestions([]);
        setLoading(false);
        return;
      }

      const safeQuery = value.replace(/[,"%]/g, " ").replace(/\s+/g, " ").trim();
      if (!safeQuery) return;

      setLoading(true);
      const { data, error } = await pocketbase
        .from("music_files")
        .select<SearchSuggestion>("id,title,composer,genre")
        .or(`title.ilike.%${safeQuery}%,composer.ilike.%${safeQuery}%,genre.ilike.%${safeQuery}%`)
        .limit(6);

      if (cancelled) return;
      setSuggestions(error ? [] : ((data ?? []) as SearchSuggestion[]));
      if (error) console.error("Search suggestions error:", error);
      setLoading(false);
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const navigate = (href: string) => {
    router.push(href);
    setQuery("");
    setFocused(false);
    onNavigate?.();
  };

  return (
    <form
      className="gmm-header-search"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        const value = query.trim();
        if (value) navigate(`/midi?search=${encodeURIComponent(value)}`);
      }}
    >
      <Search size={16} aria-hidden="true" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 120)}
        placeholder="Search title, artist, genre"
        aria-label="Search MIDI library"
      />
      {!query ? <kbd>/</kbd> : null}

      {focused && query.trim().length >= 2 ? (
        <div className="gmm-search-results">
          <button
            type="submit"
            onMouseDown={(event) => event.preventDefault()}
            className="gmm-search-all"
          >
            <span>Search all for <strong>{query.trim()}</strong></span>
            <Search size={15} />
          </button>

          {loading ? (
            <p className="gmm-search-status"><Loader2 size={15} className="animate-spin" /> Finding matches</p>
          ) : suggestions.length ? (
            <div className="gmm-search-list">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.id}
                  type="button"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    navigate(`/midi/${suggestion.id}`);
                  }}
                >
                  <span className="gmm-search-icon"><Music2 size={16} /></span>
                  <span className="min-w-0">
                    <strong>{suggestion.title}</strong>
                    <small>{suggestion.composer || "Unknown composer"}{suggestion.genre ? ` / ${suggestion.genre}` : ""}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="gmm-search-status">No quick matches. Press Enter to search everything.</p>
          )}
        </div>
      ) : null}
    </form>
  );
}

