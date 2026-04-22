using Microsoft.EntityFrameworkCore;
using Polly;
using Web.Data;
using Web.Exceptions;
using Web.Models;

namespace Web.Services;

public class SyncService : ISyncService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<SyncService> _logger;
    private readonly ISyncLogService _syncLogService;

    private readonly AsyncPolicy _policy;
    private readonly SemaphoreSlim _syncSemaphore = new(1, 1);
    private BusyTask? _syncTask;

    public SyncService(IServiceScopeFactory scopeFactory, ILogger<SyncService> logger, ISyncLogService syncLogService)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
        _syncLogService = syncLogService;
        _policy = Policy
            .Handle<ServerUnreachableException>()
            .RetryAsync(2,
                onRetry: (_, retryCount, ctx) =>
                {
                    _logger.LogWarning("Server not reachable, retry connections with longer timeout for a {0}. time.",
                        retryCount);
                    ctx["TryCount"] = retryCount;
                });
    }

    public BusyTask? GetCurrentSyncTask()
    {
        return _syncTask;
    }

    public async Task Sync(SyncType syncType)
    {
        if (!await _syncSemaphore.WaitAsync(0))
        {
            _logger.LogInformation("Skipping {SyncType} sync because another sync is already running.", syncType);
            return;
        }

        try
        {
            using var scope = _scopeFactory.CreateScope();
            _logger.LogInformation("{SyncType} sync started.", syncType);

            var plexService = scope.ServiceProvider.GetRequiredService<IPlexRestService>();
            var unitOfWork = scope.ServiceProvider.GetRequiredService<UnitOfWork>();
            var dbContext = scope.ServiceProvider.GetRequiredService<CustomDbContext>();

            var account = await SyncAccount(unitOfWork, plexService);
            if (string.IsNullOrEmpty(account?.AuthToken))
            {
                _logger.LogInformation(
                    "Cannot sync available media servers because the authorization token is missing. A Plex login is necessary.");
                return;
            }

            var knownServers = unitOfWork.ServerRepository.GetAll();
            var previousServerStatuses = knownServers.ToDictionary(x => x.Id, x => x.IsOnline);

            var syncServers = await SyncServers(account, unitOfWork, plexService);
            var servers = await SyncConnections(syncServers, unitOfWork, plexService, previousServerStatuses);
            var onlineServers = servers.Where(x => x.IsOnline).ToList();

            if (syncType == SyncType.Full)
            {
                var libraries = await SyncLibraries(onlineServers, unitOfWork);
                var movies = await SyncMovies(libraries, plexService);
                var tvShows = await SyncTvShows(libraries, plexService);
                var episodes = await SyncEpisodes(libraries, plexService);

                await ReplaceMediaForSyncedLibraries(dbContext, unitOfWork, libraries, movies, tvShows, episodes);
                await SyncPlaylists(onlineServers, unitOfWork, plexService);
                await _syncLogService.LogAsync("Background media scan completed.", "sync");
            }

            await unitOfWork.Save();
            _logger.LogInformation("{SyncType} sync completed.", syncType);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "An unexpected error occurred while syncing.");
            await _syncLogService.LogAsync(
                $"Sync failed: {exception.Message}",
                "sync-error",
                level: "error");
        }
        finally
        {
            _syncTask = null;
            _syncSemaphore.Release();
        }
    }

    private async Task<Account?> SyncAccount(UnitOfWork unitOfWork, IPlexRestService plexService)
    {
        IReadOnlyCollection<Account> accounts = unitOfWork.AccountRepository.GetAll();
        if (!accounts.Any())
            return null;

        var account = accounts.First();
        Account? myPlexAccount = await plexService.GetMyPlexAccount(account.AuthToken);
        if (myPlexAccount == null)
            return null;

        await unitOfWork.AccountRepository.Update(myPlexAccount);
        return myPlexAccount;
    }

    private async Task<IReadOnlyCollection<Server>> SyncServers(Account account, UnitOfWork unitOfWork,
        IPlexRestService plexService)
    {
        ServerRepository serverRepository = unitOfWork.ServerRepository;
        _syncTask = new BusyTask() { Name = "Syncing servers", Type = TaskType.Syncing };

        var serversInDb = serverRepository.GetAll();
        var serversFromApi = (await plexService.RetrieveServers(account)).ToList();
        var toRemove = serversInDb.ExceptBy(serversFromApi.Select(x => x.Id), server => server.Id).ToList();
        _logger.LogInformation("Syncing {Count} servers: ({Servers})", serversFromApi.Count,
            string.Join(", ", serversFromApi.Select(x => x.Name)));
        await serverRepository.Remove(toRemove);
        return serversFromApi;
    }

    private async Task<IReadOnlyCollection<Server>> SyncConnections(IReadOnlyCollection<Server> servers,
        UnitOfWork unitOfWork, IPlexRestService plexService, IReadOnlyDictionary<string, bool> previousServerStatuses)
    {
        _syncTask = new BusyTask() { Name = "Syncing server connections", Type = TaskType.Syncing };

        foreach (var server in servers)
        {
            try
            {
                var uriFromFastestConnection = await _policy.ExecuteAsync<string?>(
                    async ctx =>
                    {
                        int count = (int)(ctx.Values.FirstOrDefault() ?? 0);
                        return await plexService.GetUriFromFastestConnection(server, 5 * (int)Math.Pow(3, count));
                    },
                    new Context());
                server.LastKnownUri = uriFromFastestConnection;
                server.LastModified = DateTimeOffset.Now;
                server.IsOnline = !string.IsNullOrEmpty(uriFromFastestConnection);

                if (server.IsOnline)
                {
                    _logger.LogInformation("Found fastest connection uri {Uri} for server {Server}",
                        uriFromFastestConnection, server.Name);
                    server.TransientToken = await plexService.GetTransientToken(server);
                }
                else
                {
                    _logger.LogInformation("Server {Server} seems to be offline, all connection attempts failed.",
                        server.Name);
                }
            }
            catch (ServerUnreachableException)
            {
                server.LastKnownUri = null;
                server.LastModified = DateTimeOffset.Now;
                server.IsOnline = false;
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "An unexpected error occurred while syncing server connections.");
            }

            await LogServerStatusChange(server, previousServerStatuses);
        }

        await unitOfWork.ServerRepository.Upsert(servers);
        return servers;
    }

    private async Task<IReadOnlyCollection<Library>> SyncLibraries(IEnumerable<Server> servers, UnitOfWork unitOfWork)
    {
        _syncTask = new BusyTask() { Name = "Syncing libraries", Type = TaskType.Syncing };

        var serverList = servers.ToList();
        var syncedServerIds = serverList.Select(x => x.Id).ToHashSet();
        var librariesInDb = (await unitOfWork.LibraryRepository.Get(x => syncedServerIds.Contains(x.ServerId))).ToList();
        var librariesInDbById = librariesInDb.ToDictionary(x => x.Id, x => x);
        List<Library> librariesFromApi = new();

        foreach (var server in serverList)
        {
            var libraries = (await scopeRetrieveLibraries(server)).ToList();
            _logger.LogInformation("Syncing {Count} libraries: ({Libraries}) of server {Server}",
                libraries.Count,
                string.Join(", ", libraries.Select(x => x.Name)),
                server.Name);
            librariesFromApi.AddRange(libraries);
        }

        var librariesFromApiIds = librariesFromApi.Select(x => x.Id).ToHashSet();
        var toRemove = librariesInDb.Where(x => !librariesFromApiIds.Contains(x.Id)).ToList();
        await unitOfWork.LibraryRepository.Remove(toRemove);

        foreach (var libraryFromApi in librariesFromApi)
        {
            if (!librariesInDbById.TryGetValue(libraryFromApi.Id, out var libraryInDb))
            {
                await unitOfWork.LibraryRepository.Insert(libraryFromApi);
            }
            else
            {
                libraryInDb.Key = libraryFromApi.Key;
                libraryInDb.Name = libraryFromApi.Name;
                libraryInDb.Type = libraryFromApi.Type;
                libraryInDb.ServerId = libraryFromApi.ServerId;
            }
        }

        return librariesFromApi.Select(library => new Library
        {
            Id = library.Id,
            Key = library.Key,
            Name = library.Name,
            Type = library.Type,
            ServerId = library.ServerId,
            Server = serverList.First(x => x.Id == library.ServerId)
        }).ToList();

        async Task<IEnumerable<Library>> scopeRetrieveLibraries(Server server)
        {
            using var scope = _scopeFactory.CreateScope();
            var plexService = scope.ServiceProvider.GetRequiredService<IPlexRestService>();
            return await plexService.RetrieveLibraries(server);
        }
    }

    private async Task<List<Movie>> SyncMovies(IEnumerable<Library> libraries, IPlexRestService plexService)
    {
        _syncTask = new BusyTask() { Name = "Syncing movies", Type = TaskType.Syncing };

        var movieLibraries = libraries.Where(x => x.Type == "movie");
        List<Movie> movies = new();
        foreach (var library in movieLibraries)
        {
            var moviesFromThisLibrary = (await plexService.RetrieveMovies(library)).ToList();
            _logger.LogInformation("Syncing {Count} movies in library {Library} from server {Server}",
                moviesFromThisLibrary.Count, library.Name, library.Server.Name);
            movies.AddRange(moviesFromThisLibrary);
        }

        return movies;
    }

    private async Task<List<TvShow>> SyncTvShows(IEnumerable<Library> libraries, IPlexRestService plexService)
    {
        _syncTask = new BusyTask() { Name = "Syncing TV shows", Type = TaskType.Syncing };

        var showLibraries = libraries.Where(x => x.Type == "show");
        List<TvShow> tvShows = new();
        foreach (var library in showLibraries)
        {
            var tvShowsFromLibrary = (await plexService.RetrieveTvShows(library)).ToList();
            _logger.LogInformation("Syncing {Count} tv shows in library {Library} from server {Server}",
                tvShowsFromLibrary.Count, library.Name, library.Server.Name);
            tvShows.AddRange(tvShowsFromLibrary);
        }

        return tvShows.DistinctBy(x => x.RatingKey).ToList();
    }

    private async Task<List<Episode>> SyncEpisodes(IEnumerable<Library> libraries, IPlexRestService plexService)
    {
        _syncTask = new BusyTask() { Name = "Syncing episodes", Type = TaskType.Syncing };

        var showLibraries = libraries.Where(x => x.Type == "show");
        List<Episode> episodes = new();
        foreach (var library in showLibraries)
        {
            var episodesFromThisLibrary = (await plexService.RetrieveEpisodes(library)).ToList();
            _logger.LogInformation("Syncing {Count} episodes in library {Library} from server {Server}",
                episodesFromThisLibrary.Count, library.Name, library.Server.Name);
            episodes.AddRange(episodesFromThisLibrary);
        }

        return episodes;
    }

    private async Task ReplaceMediaForSyncedLibraries(CustomDbContext dbContext, UnitOfWork unitOfWork,
        IReadOnlyCollection<Library> syncedLibraries, IReadOnlyCollection<Movie> movies, IReadOnlyCollection<TvShow> tvShows,
        IReadOnlyCollection<Episode> episodes)
    {
        var syncedLibraryIds = syncedLibraries.Select(x => x.Id).ToHashSet();
        var syncedMovieLibraryIds = syncedLibraries.Where(x => x.Type == "movie").Select(x => x.Id).ToHashSet();
        var syncedShowLibraryIds = syncedLibraries.Where(x => x.Type == "show").Select(x => x.Id).ToHashSet();
        var serverNamesById = unitOfWork.ServerRepository.GetAll().ToDictionary(x => x.Id, x => x.Name);

        var existingMovies = await dbContext.Movies
            .Where(x => syncedMovieLibraryIds.Contains(x.LibraryId))
            .AsNoTracking()
            .ToListAsync();
        var existingTvShows = await dbContext.TvShows
            .Where(x => syncedShowLibraryIds.Contains(x.LibraryId))
            .AsNoTracking()
            .ToListAsync();

        await LogMediaChanges(existingMovies, movies, serverNamesById, "movie");
        await LogMediaChanges(existingTvShows, tvShows, serverNamesById, "tvshow");

        var existingMediaFiles = await dbContext.MediaFiles
            .Where(x => syncedLibraryIds.Contains(x.LibraryId))
            .ToListAsync();
        var existingEpisodes = await dbContext.Episodes
            .Where(x => syncedShowLibraryIds.Contains(x.LibraryId))
            .ToListAsync();
        var existingTvShowEntities = await dbContext.TvShows
            .Where(x => syncedShowLibraryIds.Contains(x.LibraryId))
            .ToListAsync();
        var existingMovieEntities = await dbContext.Movies
            .Where(x => syncedMovieLibraryIds.Contains(x.LibraryId))
            .ToListAsync();

        dbContext.MediaFiles.RemoveRange(existingMediaFiles);
        dbContext.Episodes.RemoveRange(existingEpisodes);
        dbContext.TvShows.RemoveRange(existingTvShowEntities);
        dbContext.Movies.RemoveRange(existingMovieEntities);

        await dbContext.Movies.AddRangeAsync(movies);
        await dbContext.TvShows.AddRangeAsync(tvShows);
        await dbContext.Episodes.AddRangeAsync(episodes);
    }

    private async Task SyncPlaylists(IReadOnlyCollection<Server> servers, UnitOfWork unitOfWork,
        IPlexRestService plexService)
    {
        _syncTask = new BusyTask() { Name = "Syncing playlists", Type = TaskType.Syncing };

        var serverIds = servers.Select(x => x.Id).ToHashSet();
        var playlistsInDb = (await unitOfWork.PlaylistRepository.Get(x => serverIds.Contains(x.ServerId))).ToList();
        var playlistsInDbById = playlistsInDb.ToDictionary(x => x.Id, x => x);
        List<Playlist> playlistsFromApi = new();

        foreach (var server in servers)
        {
            try
            {
                var playlistList = (await plexService.RetrievePlaylists(server)).ToList();
                _logger.LogInformation("Syncing {Count} playlists from server {Server}",
                    playlistList.Count, server.Name);
                playlistsFromApi.AddRange(playlistList);
            }
            catch (Exception exception)
            {
                _logger.LogError(exception, "Could not retrieve playlist metadata of server {Server}.", server.Name);
            }
        }

        var playlistIdsFromApi = playlistsFromApi.Select(x => x.Id).ToHashSet();
        var toRemove = playlistsInDb.Where(x => !playlistIdsFromApi.Contains(x.Id)).ToList();
        await unitOfWork.PlaylistRepository.Remove(toRemove);

        foreach (var playlistFromApi in playlistsFromApi)
        {
            if (!playlistsInDbById.TryGetValue(playlistFromApi.Id, out var playlistInDb))
            {
                await unitOfWork.PlaylistRepository.Insert(playlistFromApi);
            }
            else
            {
                playlistInDb.Name = playlistFromApi.Name;
                playlistInDb.Items = playlistFromApi.Items;
                playlistInDb.ServerId = playlistFromApi.ServerId;
            }
        }
    }

    private async Task LogServerStatusChange(Server server, IReadOnlyDictionary<string, bool> previousServerStatuses)
    {
        if (!previousServerStatuses.TryGetValue(server.Id, out var previousStatus))
            return;

        if (previousStatus == server.IsOnline)
            return;

        await _syncLogService.LogAsync(
            server.IsOnline
                ? $"Plex server {server.Name} is online."
                : $"Plex server {server.Name} is offline.",
            "server-status",
            level: server.IsOnline ? "info" : "warning",
            serverId: server.Id,
            serverName: server.Name);
    }

    private async Task LogMediaChanges<TMedia>(IReadOnlyCollection<TMedia> existingItems,
        IReadOnlyCollection<TMedia> currentItems, IReadOnlyDictionary<string, string> serverNamesById, string mediaType)
        where TMedia : class
    {
        var existingByKey = existingItems.ToDictionary(GetRatingKey);
        var currentByKey = currentItems.ToDictionary(GetRatingKey);

        foreach (var addedKey in currentByKey.Keys.Except(existingByKey.Keys).Order())
        {
            var item = currentByKey[addedKey];
            var serverId = GetServerId(item);
            var serverName = serverNamesById.GetValueOrDefault(serverId, serverId);
            await _syncLogService.LogAsync(
                $"Added {FormatMediaType(mediaType)} {GetTitle(item)} under Plex server {serverName}.",
                "media-added",
                serverId: serverId,
                serverName: serverName,
                mediaType: mediaType,
                mediaName: GetTitle(item));
        }

        foreach (var removedKey in existingByKey.Keys.Except(currentByKey.Keys).Order())
        {
            var item = existingByKey[removedKey];
            var serverId = GetServerId(item);
            var serverName = serverNamesById.GetValueOrDefault(serverId, serverId);
            await _syncLogService.LogAsync(
                $"Removed {FormatMediaType(mediaType)} {GetTitle(item)} from Plex server {serverName}.",
                "media-removed",
                level: "warning",
                serverId: serverId,
                serverName: serverName,
                mediaType: mediaType,
                mediaName: GetTitle(item));
        }
    }

    private static string GetRatingKey<TMedia>(TMedia item)
        where TMedia : class
    {
        return item switch
        {
            Movie movie => movie.RatingKey,
            TvShow tvShow => tvShow.RatingKey,
            _ => throw new ArgumentOutOfRangeException(nameof(item))
        };
    }

    private static string GetServerId<TMedia>(TMedia item)
        where TMedia : class
    {
        return item switch
        {
            Movie movie => movie.ServerId,
            TvShow tvShow => tvShow.ServerId,
            _ => throw new ArgumentOutOfRangeException(nameof(item))
        };
    }

    private static string GetTitle<TMedia>(TMedia item)
        where TMedia : class
    {
        return item switch
        {
            Movie movie => movie.Title,
            TvShow tvShow => tvShow.Title,
            _ => throw new ArgumentOutOfRangeException(nameof(item))
        };
    }

    private static string FormatMediaType(string mediaType)
    {
        return mediaType.Equals("tvshow", StringComparison.OrdinalIgnoreCase) ? "TV show" : "movie";
    }
}
