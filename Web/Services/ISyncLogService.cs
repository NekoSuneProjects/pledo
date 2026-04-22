using Web.Models.DTO;

namespace Web.Services;

public interface ISyncLogService
{
    Task LogAsync(SyncLogEntryResource entry);
    Task LogAsync(string message, string eventType, string level = "info",
        string? serverId = null, string? serverName = null, string? mediaType = null, string? mediaName = null);
    Task<IReadOnlyCollection<SyncLogEntryResource>> GetRecentEntries(int take = 100);
}
