using Web.Models;

namespace Web.Services;

public interface IDownloadService
{
    IReadOnlyCollection<DownloadElement> GetPendingDownloads();
    IReadOnlyCollection<DownloadElement> GetAll();
    Task CancelAllPendingDownloads();
    Task RemoveAllFinishedOrCancelledDownloads();
    Task DownloadMovie(string key, string? mediaFileKey, string? serverId);
    Task DownloadEpisode(string key, string? mediaFileKey, string? serverId);
    Task DownloadSeason(string key, int season, string? serverId);
    Task DownloadTvShow(string key, string? serverId);
    Task DownloadPlaylist(string key, string? serverId);
    Task CancelDownload(string key);
}
