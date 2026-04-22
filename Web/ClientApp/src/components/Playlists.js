import React, { useEffect, useState } from "react";
import DownloadButton from "./DownloadButton";

export function Playlists() {
  const [loading, setLoading] = useState(true);
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    const populateData = async () => {
      const response = await fetch("api/playlist");
      const data = await response.json();
      setPlaylists(data);
      setLoading(false);
    };

    populateData().catch((error) => {
      console.error(error);
      setPlaylists([]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-8">
      <section className="surface p-6 sm:p-8">
        <p className="eyebrow">Playlists</p>
        <h1 className="page-title mt-3">Download synced Plex playlists with their original server mapping.</h1>
        <p className="section-copy mt-4 max-w-3xl">
          Playlist items stay attached to the source server they came from, so batch downloads still follow the right
          Plex mapping underneath.
        </p>
      </section>

      {loading ? <div className="empty-state">Loading playlists...</div> : null}
      {!loading && playlists.length === 0 ? <div className="empty-state">No playlists are available right now.</div> : null}

      {!loading && playlists.length > 0 ? (
        <div className="space-y-4">
          {playlists.map((playlist) => (
            <details key={playlist.id} className="surface overflow-hidden p-0">
              <summary className="cursor-pointer list-none p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xl font-semibold text-white">{playlist.name}</p>
                    <p className="mt-2 text-sm text-slate-400">{playlist.items.length} items</p>
                  </div>
                  <span className="chip">{playlist.server?.name ?? "Unknown server"}</span>
                </div>
              </summary>

              <div className="border-t border-white/10 p-6 pt-0">
                <ul className="space-y-3">
                  {playlist.items.map((item) => (
                    <li key={`${playlist.id}-${item.id}`} className="surface-soft flex items-center justify-between gap-3 p-4">
                      <span className="text-sm text-slate-200">{item.name ?? item.id}</span>
                      <span className="chip">{item.type}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-5">
                  <DownloadButton mediaKey={playlist.id} mediaType="playlist">
                    Queue Playlist Download
                  </DownloadButton>
                </div>
              </div>
            </details>
          ))}
        </div>
      ) : null}
    </div>
  );
}
