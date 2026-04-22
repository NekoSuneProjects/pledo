using System.Text;
using System.Text.Json;
using Web.Models.DTO;

namespace Web.Services;

public class SyncLogService : ISyncLogService
{
    private const int MaxPersistedEntries = 1000;
    private readonly string _logPath;
    private readonly SemaphoreSlim _semaphore = new(1, 1);
    private readonly ILogger<SyncLogService> _logger;

    public SyncLogService(ILogger<SyncLogService> logger)
    {
        _logger = logger;
        _logPath = Path.Combine(PreferencesProvider.GetDataDirectory(), "sync-events.jsonl");
    }

    public async Task LogAsync(SyncLogEntryResource entry)
    {
        entry.Timestamp = entry.Timestamp == default ? DateTimeOffset.UtcNow : entry.Timestamp;
        entry.Level = string.IsNullOrWhiteSpace(entry.Level) ? "info" : entry.Level;
        entry.EventType = string.IsNullOrWhiteSpace(entry.EventType) ? "general" : entry.EventType;
        entry.Message = entry.Message ?? "";

        try
        {
            await _semaphore.WaitAsync();
            Directory.CreateDirectory(Path.GetDirectoryName(_logPath) ?? PreferencesProvider.GetDataDirectory());

            var serialized = JsonSerializer.Serialize(entry);
            await File.AppendAllTextAsync(_logPath, serialized + Environment.NewLine, Encoding.UTF8);
            await TrimIfNeeded();
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to write sync log entry.");
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public Task LogAsync(string message, string eventType, string level = "info",
        string? serverId = null, string? serverName = null, string? mediaType = null, string? mediaName = null)
    {
        return LogAsync(new SyncLogEntryResource
        {
            Message = message,
            EventType = eventType,
            Level = level,
            ServerId = serverId,
            ServerName = serverName,
            MediaType = mediaType,
            MediaName = mediaName
        });
    }

    public async Task<SyncLogPageResource> GetEntries(int skip = 0, int take = 100)
    {
        skip = Math.Max(0, skip);
        take = Math.Max(1, take);

        try
        {
            await _semaphore.WaitAsync();
            if (!File.Exists(_logPath))
                return new SyncLogPageResource();

            var lines = await File.ReadAllLinesAsync(_logPath);
            var orderedEntries = lines
                .Where(line => !string.IsNullOrWhiteSpace(line))
                .Select(ParseLine)
                .Where(entry => entry != null)
                .Cast<SyncLogEntryResource>()
                .Reverse()
                .ToList();

            var items = orderedEntries
                .Skip(skip)
                .Take(take)
                .ToList();

            return new SyncLogPageResource
            {
                Items = items,
                TotalItems = orderedEntries.Count,
                HasMore = skip + items.Count < orderedEntries.Count
            };
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Failed to read sync log entries.");
            return new SyncLogPageResource();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<IReadOnlyCollection<SyncLogEntryResource>> GetRecentEntries(int take = 100)
    {
        var page = await GetEntries(0, take);
        return page.Items;
    }

    private async Task TrimIfNeeded()
    {
        if (!File.Exists(_logPath))
            return;

        var lines = await File.ReadAllLinesAsync(_logPath);
        if (lines.Length <= MaxPersistedEntries)
            return;

        var trimmed = lines.TakeLast(MaxPersistedEntries).ToArray();
        await File.WriteAllLinesAsync(_logPath, trimmed, Encoding.UTF8);
    }

    private static SyncLogEntryResource? ParseLine(string line)
    {
        try
        {
            return JsonSerializer.Deserialize<SyncLogEntryResource>(line);
        }
        catch
        {
            return null;
        }
    }
}
