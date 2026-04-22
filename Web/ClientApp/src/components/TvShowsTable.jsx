import { DownloadButton2 } from "./DownloadButton2";
import {
  collectTvShowResolutions,
  collectTvShowSeasons,
  formatEpisodeCode,
  humanizeByteSize,
} from "../utils/media";
import { ServerBadge } from "./ServerBadge";

export function TvShowsTable({ items, knownServer = [], showServer = false }) {
  const tvShows = items ?? [];
  const shouldShowServer = showServer || knownServer.length > 1;

  if (tvShows.length === 0) {
    return <div className="empty-state">No TV shows matched the current selection.</div>;
  }

  return (
    <div className="space-y-4">
      {tvShows.map((tvShow) => {
        const seasons = collectTvShowSeasons(tvShow);
        const resolutions = collectTvShowResolutions(tvShow);

        return (
          <details key={tvShow.ratingKey} className="surface overflow-hidden p-0">
            <summary className="cursor-pointer list-none p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="eyebrow">TV Show</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{tvShow.title}</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {shouldShowServer ? <ServerBadge knownServers={knownServer} serverId={tvShow.serverId} /> : null}
                    <span className="chip">{tvShow.episodes?.length ?? 0} episodes</span>
                    <span className="chip">{seasons.length} seasons</span>
                    {resolutions.map((resolution) => (
                      <span key={`${tvShow.ratingKey}-${resolution}`} className="chip">
                        {resolution}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {seasons.map((seasonNumber) => (
                    <DownloadButton2
                      key={`${tvShow.ratingKey}-season-${seasonNumber}`}
                      mediaType="tvshow"
                      mediaKey={tvShow.ratingKey}
                      season={seasonNumber}
                    >
                      Season {seasonNumber}
                    </DownloadButton2>
                  ))}
                  <DownloadButton2 color="info" mediaType="tvshow" mediaKey={tvShow.ratingKey}>
                    Complete Show
                  </DownloadButton2>
                </div>
              </div>
            </summary>

            <div className="border-t border-white/10 p-6 pt-0">
              <div className="table-wrap">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Episode</th>
                        <th>Title</th>
                        <th>Year</th>
                        <th>Video Codec</th>
                        <th>Resolution</th>
                        <th>Size</th>
                        <th>Download</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(tvShow.episodes ?? []).map((episode) => {
                        const mediaFile = episode.mediaFiles?.[0];

                        return (
                          <tr key={episode.ratingKey}>
                            <td>{formatEpisodeCode(episode.seasonNumber, episode.episodeNumber)}</td>
                            <td>{episode.title}</td>
                            <td>{episode.year ?? "—"}</td>
                            <td>{mediaFile?.videoCodec ?? "—"}</td>
                            <td>{mediaFile?.videoResolution ?? "—"}</td>
                            <td>{humanizeByteSize(mediaFile?.totalBytes)}</td>
                            <td>
                              {mediaFile ? (
                                <DownloadButton2
                                  mediaType="episode"
                                  mediaKey={episode.ratingKey}
                                  mediaFileKey={mediaFile.downloadUri}
                                  knownServers={knownServer}
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
            </div>
          </details>
        );
      })}
    </div>
  );
}
