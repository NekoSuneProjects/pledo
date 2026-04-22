using Web.Models;

namespace Web.Services;

public class PeriodicallySyncBackgroundService : BackgroundService
{
    private static readonly TimeSpan LoopDelay = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan ConnectionSyncInterval = TimeSpan.FromMinutes(5);

    private readonly ILogger<PeriodicallySyncBackgroundService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ISyncService _syncService;

    private DateTimeOffset _lastConnectionSyncAt = DateTimeOffset.MinValue;
    private DateTimeOffset _lastMediaSyncAt = DateTimeOffset.MinValue;

    public PeriodicallySyncBackgroundService(ILogger<PeriodicallySyncBackgroundService> logger,
        IServiceScopeFactory scopeFactory, ISyncService syncService)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _syncService = syncService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background sync service running.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await RunScheduledSyncs(stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Automatic background sync failed.");
            }

            await Task.Delay(LoopDelay, stoppingToken);
        }
    }

    public override Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Background sync service is stopping.");
        return base.StopAsync(stoppingToken);
    }

    private async Task RunScheduledSyncs(CancellationToken stoppingToken)
    {
        if (_syncService.GetCurrentSyncTask() != null)
            return;

        using var scope = _scopeFactory.CreateScope();
        var settingsService = scope.ServiceProvider.GetRequiredService<ISettingsService>();
        var mediaSyncEnabled = await settingsService.GetAutomaticMediaSyncEnabled();
        var mediaSyncInterval = TimeSpan.FromMinutes(await settingsService.GetAutomaticMediaSyncIntervalMinutes());
        var now = DateTimeOffset.UtcNow;

        if (mediaSyncEnabled && now - _lastMediaSyncAt >= mediaSyncInterval)
        {
            await _syncService.Sync(SyncType.Full);
            _lastMediaSyncAt = DateTimeOffset.UtcNow;
            _lastConnectionSyncAt = _lastMediaSyncAt;
            return;
        }

        if (now - _lastConnectionSyncAt >= ConnectionSyncInterval)
        {
            await _syncService.Sync(SyncType.Connection);
            _lastConnectionSyncAt = DateTimeOffset.UtcNow;
        }
    }
}
