import React, { useEffect, useState } from "react";
import { LibrarySelector } from "./LibrarySelector";
import { MoviesTable } from "./MoviesTable";
import { PaginationRow } from "./Pagination";

function PaginatedTableContainer({ libraryId, server }) {
  const [items, setItems] = useState({ items: [], totalItems: 0, loading: false });
  const [pageNumber, setPageNumber] = useState(0);
  const pageSize = 50;

  useEffect(() => {
    setPageNumber(0);
  }, [libraryId]);

  useEffect(() => {
    if (!libraryId) {
      setItems({ items: [], totalItems: 0, loading: false });
      return;
    }

    const populateData = async () => {
      setItems((current) => ({ ...current, loading: true }));
      const uri =
        "api/media/movie?" +
        new URLSearchParams({
          libraryId,
          pageNumber: pageNumber + 1,
          pageSize,
        });
      const response = await fetch(uri);
      const data = await response.json();
      setItems({ items: data.items, totalItems: data.totalItems, loading: false });
    };

    populateData().catch((error) => {
      console.error(error);
      setItems({ items: [], totalItems: 0, loading: false });
    });
  }, [libraryId, pageNumber]);

  if (!libraryId) {
    return <div className="empty-state">Choose a movie library to start browsing synced Plex titles.</div>;
  }

  if (items.loading) {
    return <div className="empty-state">Loading mapped movies from the selected Plex library...</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-400">
          {items.totalItems} movie files available {server?.name ? `on ${server.name}` : "in this library"}.
        </p>
        <span className="chip">Page {pageNumber + 1}</span>
      </div>
      <PaginationRow pages={Math.ceil(items.totalItems / pageSize)} currentPage={pageNumber} selectPage={setPageNumber} />
      <MoviesTable items={items.items} knownServer={server ? [server] : []} />
    </div>
  );
}

export function Movies() {
  const [selectedServer, setSelectedServer] = useState(null);
  const [selectedLibrary, setSelectedLibrary] = useState(null);

  return (
    <div className="space-y-8">
      <section className="surface p-6 sm:p-8">
        <p className="eyebrow">Movie Browser</p>
        <h1 className="page-title mt-3">Browse synced movie libraries with a cleaner dark Plex-inspired layout.</h1>
        <p className="section-copy mt-4 max-w-3xl">
          Pick a server and movie library, then browse every synced file version with resolution, codec, file size,
          and queue/direct download actions.
        </p>
      </section>

      <LibrarySelector
        mediaType="movie"
        onServerSelected={setSelectedServer}
        onLibrarySelected={setSelectedLibrary}
      />

      <PaginatedTableContainer libraryId={selectedLibrary} server={selectedServer} />
    </div>
  );
}
