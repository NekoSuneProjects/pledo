import { DownloadButton2 } from "./DownloadButton2";
import { humanizeByteSize } from "../utils/media";
import { ServerBadge } from "./ServerBadge";

export function MoviesTable({ items, knownServer = [], showServer = false }) {
  const movies = items ?? [];
  const shouldShowServer = showServer || knownServer.length > 1;

  if (movies.length === 0) {
    return <div className="empty-state">No movies matched the current selection.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="table-wrap">
        <div className="table-scroll">
          <table className="data-table">
            <thead>
              <tr>
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
              {movies.flatMap((movie) =>
                (movie.mediaFiles ?? []).map((mediaFile, index) => (
                  <tr key={`${movie.ratingKey}-${mediaFile.downloadUri}-${index}`}>
                    <td>
                      <div>
                        <p className="font-semibold text-white">{movie.title}</p>
                        <p className="mt-1 text-xs text-slate-400">{mediaFile.container ?? "Unknown container"}</p>
                      </div>
                    </td>
                    <td>{movie.year ?? "—"}</td>
                    {shouldShowServer ? (
                      <td>
                        <ServerBadge knownServers={knownServer} serverId={movie.serverId} />
                      </td>
                    ) : null}
                    <td>{mediaFile.videoCodec ?? "—"}</td>
                    <td>{mediaFile.videoResolution ?? "—"}</td>
                    <td>{humanizeByteSize(mediaFile.totalBytes)}</td>
                    <td>
                      <DownloadButton2
                        mediaType="movie"
                        mediaKey={movie.ratingKey}
                        mediaFileKey={mediaFile.downloadUri}
                        knownServers={knownServer}
                        serverId={movie.serverId}
                        downloadBrowserPossible
                      >
                        Queue Download
                      </DownloadButton2>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-sm text-slate-400">Showing {movies.length} mapped movie entries.</p>
    </div>
  );
}
