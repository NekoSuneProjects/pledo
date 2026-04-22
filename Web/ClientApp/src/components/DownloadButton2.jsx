import React, { useMemo, useState } from "react";
import { buildDirectDownloadLink, buildQueueDownloadPath } from "../utils/media";

export function DownloadButton2({
  mediaKey,
  mediaFileKey,
  mediaType,
  season,
  serverId,
  knownServers,
  downloadBrowserPossible,
  color,
  children,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const directDownloadLink = useMemo(
    () =>
      buildDirectDownloadLink({
        knownServers,
        serverId,
        mediaFileKey,
      }),
    [knownServers, mediaFileKey, serverId]
  );

  const handleClick = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(
        buildQueueDownloadPath({
          mediaType,
          mediaKey,
          mediaFileKey,
          season,
        }),
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        alert("Could not add to the download queue");
      }
    } catch (error) {
      console.log(error);
      alert("Could not add to the download queue");
    } finally {
      setIsLoading(false);
    }
  };

  const queueButtonClass =
    color === "info"
      ? "inline-flex items-center justify-center rounded-2xl border border-cyan-400/30 bg-cyan-500/20 px-4 py-2.5 text-sm font-medium text-cyan-100 transition hover:bg-cyan-500/30 disabled:cursor-not-allowed disabled:opacity-60"
      : "btn-primary";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" className={queueButtonClass} disabled={isLoading} onClick={handleClick}>
        {isLoading ? "Adding..." : children}
      </button>
      {downloadBrowserPossible && directDownloadLink ? (
        <a href={directDownloadLink} download className="btn-secondary">
          Direct Link
        </a>
      ) : null}
    </div>
  );
}
