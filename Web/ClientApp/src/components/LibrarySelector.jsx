import React, { useEffect, useMemo, useState } from "react";
import { Selection } from "./Selection";

export function LibrarySelector({ mediaType, onServerSelected, onLibrarySelected }) {
  const [selectedServerId, setSelectedServerId] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [libraryData, setLibraryData] = useState({ servers: [], libraries: [], loading: true });

  useEffect(() => {
    const fetchData = async () => {
      const uri = "api/library?" + new URLSearchParams({ mediaType });
      const response = await fetch(uri);
      const data = await response.json();
      const uniqueServers = data
        .map((library) => library.server)
        .filter((server, index, self) => index === self.findIndex((entry) => entry.id === server.id));

      setLibraryData({
        libraries: data,
        servers: uniqueServers,
        loading: false,
      });
    };

    fetchData().catch((error) => {
      console.error(error);
      setLibraryData({ servers: [], libraries: [], loading: false });
    });
  }, [mediaType]);

  useEffect(() => {
    if (!selectedServerId && libraryData.servers.length > 0) {
      setSelectedServerId(libraryData.servers[0].id);
    }
  }, [libraryData.servers, selectedServerId]);

  useEffect(() => {
    const selectedServer = libraryData.servers.find((server) => server.id === selectedServerId) ?? null;
    onServerSelected(selectedServer);

    const matchingLibraries = libraryData.libraries.filter((library) => library.serverId === selectedServerId);
    const nextLibraryId = matchingLibraries[0]?.id ?? "";
    if (nextLibraryId !== selectedLibraryId) {
      setSelectedLibraryId(nextLibraryId);
    }
  }, [libraryData.libraries, libraryData.servers, onServerSelected, selectedLibraryId, selectedServerId]);

  useEffect(() => {
    onLibrarySelected(selectedLibraryId || null);
  }, [onLibrarySelected, selectedLibraryId]);

  const serverOptions = useMemo(
    () => libraryData.servers.map((server) => ({ label: server.name, value: server.id })),
    [libraryData.servers]
  );
  const libraryOptions = useMemo(
    () =>
      libraryData.libraries
        .filter((library) => library.serverId === selectedServerId)
        .map((library) => ({ label: library.name, value: library.id })),
    [libraryData.libraries, selectedServerId]
  );

  return (
    <div className="surface p-5 sm:p-6">
      <div className="mb-5">
        <p className="eyebrow">Library Mapping</p>
        <h2 className="mt-2 text-xl font-semibold text-white">Choose a server and library</h2>
        <p className="section-copy mt-2">
          We keep the original Plex server mapping, so browsing and download actions stay tied to the correct source.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Selection
          title="Server"
          items={serverOptions}
          value={selectedServerId}
          disabled={libraryData.loading}
          placeholder="No servers available"
          onChange={(serverId) => setSelectedServerId(serverId)}
        />
        <Selection
          title="Library"
          items={libraryOptions}
          value={selectedLibraryId}
          disabled={libraryData.loading || !selectedServerId}
          placeholder="No libraries available"
          onChange={(libraryId) => setSelectedLibraryId(libraryId)}
        />
      </div>
    </div>
  );
}
