import { DownloadButton2 } from "./DownloadButton2";
import { formatEpisodeCode, humanizeByteSize } from "../utils/media";
import { ServerBadge } from "./ServerBadge";

export function EpisodesTable({ items, knownServers = [], showServer = false }) {
  const episodes = items ?? [];
  const shouldShowServer = showServer || knownServers.length > 1;

  if (episodes.length === 0) {
    return <div className="empty-state">No episodes matched the current selection.</div>;
  }

  return (
    <div className="table-wrap">
      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              <th>Show</th>
              <th>Episode</th>
              <th>Title</th>
              <th>Year</th>
              {shouldShowServer ? <th>Server</th> : null}
              <th>Video Codec</th>
              <th>Resolution</th>
              <th>Size</th>
              <th>Download</th>
            </tr>
          </thead>
          <tbody>
            {episodes.map((episode) => {
              const mediaFile = episode.mediaFiles?.[0];

              return (
                <tr key={episode.ratingKey}>
                  <td className="font-medium text-white">{episode.tvShow?.title ?? "Unknown show"}</td>
                  <td>{formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)}</td>
                  <td>{episode.title}</td>
                  <td>{episode.year ?? "—"}</td>
                  {shouldShowServer ? (
                    <td>
                      <ServerBadge knownServers={knownServers} serverId={episode.serverId} />
                    </td>
                  ) : null}
                  <td>{mediaFile?.videoCodec ?? "—"}</td>
                  <td>{mediaFile?.videoResolution ?? "—"}</td>
                  <td>{humanizeByteSize(mediaFile?.totalBytes)}</td>
                  <td>
                    {mediaFile ? (
                      <DownloadButton2
                        mediaType="episode"
                        mediaKey={episode.ratingKey}
                        mediaFileKey={mediaFile.downloadUri}
                        knownServers={knownServers}
                        serverId={episode.serverId}
                        downloadBrowserPossible
                      >
                        Queue Episode
                      </DownloadButton2>
                    ) : (
                      <span className="text-xs text-slate-500">No mapped file</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
