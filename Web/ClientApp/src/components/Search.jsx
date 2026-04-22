import React, { useEffect, useMemo, useState } from "react";
import { MoviesTable } from "./MoviesTable";
import { TvShowsTable } from "./TvShowsTable";
import { EpisodesTable } from "./EpisodesTable";

const emptySearchResults = {
  movies: [],
  tvShows: [],
  episodes: [],
  totalMoviesMatching: 0,
  totalTvShowsMatching: 0,
  totalEpisodesMatching: 0,
};

export function Search() {
  const [knownServers, setKnownServers] = useState([]);
  const [metadata, setMetadata] = useState({ years: [], resolutions: [] });
  const [form, setForm] = useState({ searchTerm: "", year: "", resolution: "" });
  const [search, setSearch] = useState({
    loading: false,
    requested: false,
    results: emptySearchResults,
    error: "",
  });

  useEffect(() => {
    const populateData = async () => {
      const [serversResponse, metadataResponse] = await Promise.all([
        fetch("api/server"),
        fetch("api/media/search-metadata"),
      ]);
      const [servers, filterMetadata] = await Promise.all([serversResponse.json(), metadataResponse.json()]);
      setKnownServers(servers);
      setMetadata(filterMetadata);
    };

    populateData().catch((error) => {
      console.error(error);
      setMetadata({ years: [], resolutions: [] });
      setKnownServers([]);
    });
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    const hasInput = form.searchTerm.trim() || form.year || form.resolution;
    if (!hasInput) {
      setSearch({
        loading: false,
        requested: true,
        results: emptySearchResults,
        error: "",
      });
      return;
    }

    setSearch((current) => ({
      ...current,
      loading: true,
      requested: true,
      error: "",
    }));

    const searchParams = new URLSearchParams();
    if (form.searchTerm.trim()) {
      searchParams.set("searchTerm", form.searchTerm.trim());
    }
    if (form.year) {
      searchParams.set("year", form.year);
    }
    if (form.resolution) {
      searchParams.set("resolution", form.resolution);
    }

    try {
      const response = await fetch(`api/media/search?${searchParams.toString()}`);
      if (!response.ok) {
        throw new Error("Search request failed.");
      }

      const results = await response.json();
      setSearch({
        loading: false,
        requested: true,
        results,
        error: "",
      });
    } catch (error) {
      console.error(error);
      setSearch({
        loading: false,
        requested: true,
        results: emptySearchResults,
        error: "Search failed. Please try again after your Plex metadata sync finishes.",
      });
    }
  };

  const totalResults = useMemo(
    () =>
      (search.results?.totalMoviesMatching ?? 0) +
      (search.results?.totalTvShowsMatching ?? 0) +
      (search.results?.totalEpisodesMatching ?? 0),
    [search.results]
  );

  return (
    <div className="space-y-8">
      <section className="surface overflow-hidden p-6 sm:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="eyebrow">Cross-Server Search</p>
            <h1 className="page-title mt-3">Search every synced Plex server from one dark, mapped view.</h1>
            <p className="section-copy mt-4 max-w-2xl">
              Search by movie title, episode title, year, or resolution. Every result keeps its original Plex server
              mapping so you can immediately see where it lives and either queue a server-side download or grab the
              direct Plex file link.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="stat-card">
                <p className="text-sm text-slate-400">Known servers</p>
                <p className="mt-2 text-3xl font-semibold text-white">{knownServers.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Year filters</p>
                <p className="mt-2 text-3xl font-semibold text-white">{metadata.years.length}</p>
              </div>
              <div className="stat-card">
                <p className="text-sm text-slate-400">Resolution filters</p>
                <p className="mt-2 text-3xl font-semibold text-white">{metadata.resolutions.length}</p>
              </div>
            </div>
          </div>

          <form className="surface-soft p-5 sm:p-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-200">Search titles, years, or resolutions</span>
                <input
                  className="field"
                  value={form.searchTerm}
                  placeholder="Try Dune, 2024, 1080p, Alien..."
                  onChange={(event) => setForm((current) => ({ ...current, searchTerm: event.target.value }))}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Year</span>
                  <select
                    className="field-select"
                    value={form.year}
                    onChange={(event) => setForm((current) => ({ ...current, year: event.target.value }))}
                  >
                    <option value="">All years</option>
                    {metadata.years.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-200">Resolution</span>
                  <select
                    className="field-select"
                    value={form.resolution}
                    onChange={(event) => setForm((current) => ({ ...current, resolution: event.target.value }))}
                  >
                    <option value="">All resolutions</option>
                    {metadata.resolutions.map((resolution) => (
                      <option key={resolution} value={resolution}>
                        {resolution}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button type="submit" className="btn-primary min-w-[10rem]" disabled={search.loading}>
                  {search.loading ? "Searching..." : "Search Plex Media"}
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setForm({ searchTerm: "", year: "", resolution: "" });
                    setSearch({
                      loading: false,
                      requested: false,
                      results: emptySearchResults,
                      error: "",
                    });
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>

      {search.requested ? (
        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <ResultCountCard label="Movies" value={search.results?.totalMoviesMatching ?? 0} />
            <ResultCountCard label="TV Shows" value={search.results?.totalTvShowsMatching ?? 0} />
            <ResultCountCard label="Episodes" value={search.results?.totalEpisodesMatching ?? 0} />
          </div>

          {search.error ? <div className="surface border border-rose-400/20 p-4 text-rose-200">{search.error}</div> : null}

          {!search.loading && totalResults === 0 && !search.error ? (
            <div className="empty-state">
              No results matched those filters yet. If you recently added a Plex server or library, run a metadata sync
              and search again.
            </div>
          ) : null}

          {search.loading ? <div className="empty-state">Searching across all synced Plex server mappings...</div> : null}

          {!search.loading && (search.results?.totalMoviesMatching ?? 0) > 0 ? (
            <SearchSection
              title="Movies"
              description="Movie results stay split by Plex server mapping, file version, and direct download link."
              count={search.results.totalMoviesMatching}
            >
              <MoviesTable items={search.results.movies} knownServer={knownServers} showServer />
            </SearchSection>
          ) : null}

          {!search.loading && (search.results?.totalTvShowsMatching ?? 0) > 0 ? (
            <SearchSection
              title="TV Shows"
              description="Download a whole show, individual seasons, or browse the mapped episodes underneath."
              count={search.results.totalTvShowsMatching}
            >
              <TvShowsTable items={search.results.tvShows} knownServer={knownServers} showServer />
            </SearchSection>
          ) : null}

          {!search.loading && (search.results?.totalEpisodesMatching ?? 0) > 0 ? (
            <SearchSection
              title="Episodes"
              description="Episode-level hits are useful when you search by year or resolution and want the exact file quickly."
              count={search.results.totalEpisodesMatching}
            >
              <EpisodesTable items={search.results.episodes} knownServers={knownServers} showServer />
            </SearchSection>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function ResultCountCard({ label, value }) {
  return (
    <div className="stat-card">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-white">{value}</p>
    </div>
  );
}

function SearchSection({ title, description, count, children }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">{title}</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title} Results</h2>
          <p className="section-copy mt-2">{description}</p>
        </div>
        <span className="chip">{count} matches</span>
      </div>
      {children}
    </section>
  );
}
