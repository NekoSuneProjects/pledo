using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Web.Data;
using Web.Models;
using Web.Models.DTO;

namespace Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class MediaController : ControllerBase
{
    private readonly UnitOfWork _unitOfWork;
    private readonly CustomDbContext _customDbContext;

    public MediaController(UnitOfWork unitOfWork, CustomDbContext customDbContext)
    {
        _unitOfWork = unitOfWork;
        _customDbContext = customDbContext;
    }

    [HttpGet("movie")]
    public async Task<ResultResource<Movie>> GetMovies([FromQuery] MediaQueryParameter queryParameter)
    {
        var totalItems = await _unitOfWork.MovieRepository.Count(x => x.LibraryId == queryParameter.LibraryId);
        var items = await _unitOfWork.MovieRepository.Get(x => x.LibraryId == queryParameter.LibraryId,
            includeProperties: nameof(Movie.MediaFiles),
            orderBy: s => s.OrderBy(x => x.Title),
            offset: (queryParameter.PageNumber - 1) * queryParameter.PageSize,
            size: queryParameter.PageSize);
        return new ResultResource<Movie>
        {
            Items = items,
            TotalItems = totalItems
        };
    }

    [HttpGet("tvshow")]
    public async Task<ResultResource<TvShow>> GetTvShows([FromQuery] MediaQueryParameter queryParameter)
    {
        var totalItems = await _unitOfWork.TvShowRepository.Count(x => x.LibraryId == queryParameter.LibraryId);
        var items = await _unitOfWork.TvShowRepository.Get(x => x.LibraryId == queryParameter.LibraryId,
            s => s.OrderBy(x => x.Title),
            nameof(TvShow.Episodes),
            offset: (queryParameter.PageNumber - 1) * queryParameter.PageSize,
            size: queryParameter.PageSize);
        return new ResultResource<TvShow>
        {
            Items = items,
            TotalItems = totalItems
        };
    }

    [HttpGet("playlist")]
    public async Task<IEnumerable<PlaylistResource>> GetPlaylists()
    {
        var playlists = await _unitOfWork.PlaylistRepository.Get(includeProperties: nameof(Playlist.Server));
        List<PlaylistResource> playlistResources = new List<PlaylistResource>();
        foreach (var playlist in playlists)
        {
            var movies =
                (await _unitOfWork.MovieRepository.Get(x => playlist.Items.Contains(x.RatingKey),
                    orderBy: s => s.OrderBy(x => x.Title))).ToDictionary(x =>
                    x.RatingKey);
            var episodes =
                (await _unitOfWork.EpisodeRepository.Get(x => playlist.Items.Contains(x.RatingKey),
                    orderBy: s => s.OrderBy(x => x.Title),
                    includeProperties: nameof(Episode.TvShow))).ToDictionary(x => x.RatingKey);

            List<PlaylistItem> items = playlist.Items.Select(x =>
            {
                if (movies.TryGetValue(x, out Movie movie))
                    return new PlaylistItem()
                        { Id = x, Name = $"{movie.Title} ({movie.Year})", Type = ElementType.Movie };
                if (episodes.TryGetValue(x, out Episode episode))
                    return new PlaylistItem()
                    {
                        Id = x,
                        Name =
                            $"{episode.Title} ({episode.TvShow.Title} S{episode.SeasonNumber}E{episode.EpisodeNumber})",
                        Type = ElementType.Movie
                    };

                return new PlaylistItem() { Id = x };
            }).ToList();
            playlistResources.Add(new PlaylistResource()
            {
                Items = items,
                Id = playlist.Id,
                Name = playlist.Name,
                Server = playlist.Server,
                ServerId = playlist.ServerId
            });
        }

        return playlistResources;
    }

    [HttpGet("search-metadata")]
    public async Task<ActionResult<SearchFilterMetadataResource>> GetSearchMetadata()
    {
        var years = await _customDbContext.Movies
            .Where(x => x.Year.HasValue)
            .Select(x => x.Year!.Value)
            .Concat(_customDbContext.Episodes.Where(x => x.Year.HasValue).Select(x => x.Year!.Value))
            .Distinct()
            .OrderByDescending(x => x)
            .ToListAsync();

        var resolutions = await _customDbContext.MediaFiles
            .Where(x => !string.IsNullOrWhiteSpace(x.VideoResolution))
            .Select(x => x.VideoResolution!)
            .Distinct()
            .ToListAsync();

        return new SearchFilterMetadataResource
        {
            Years = years,
            Resolutions = resolutions
                .OrderByDescending(GetResolutionRank)
                .ThenByDescending(x => x, StringComparer.OrdinalIgnoreCase)
                .ToList()
        };
    }

    [HttpGet("search")]
    public async Task<ActionResult<SearchResultResource>> Search([FromQuery] string? searchTerm,
        [FromQuery] int? year, [FromQuery] string? resolution)
    {
        var trimmedSearchTerm = string.IsNullOrWhiteSpace(searchTerm)
            ? null
            : searchTerm.Trim();
        var searchPattern = ToLikePattern(trimmedSearchTerm);
        var yearFromSearch = !year.HasValue && int.TryParse(trimmedSearchTerm, out var parsedYear)
            ? parsedYear
            : (int?)null;
        var resolutionFilter = string.IsNullOrWhiteSpace(resolution)
            ? null
            : resolution.Trim();
        var searchLooksLikeResolution = resolutionFilter == null &&
                                        !string.IsNullOrWhiteSpace(trimmedSearchTerm) &&
                                        LooksLikeResolution(trimmedSearchTerm);

        SearchResultResource result = new();
        if (searchPattern == null && !year.HasValue && resolutionFilter == null)
            return result;

        var movies = (await _unitOfWork.MovieRepository.Get(x =>
                (
                    searchPattern == null ||
                    EF.Functions.Like(x.Title, searchPattern) ||
                    (yearFromSearch.HasValue && x.Year == yearFromSearch.Value) ||
                    (searchLooksLikeResolution && x.MediaFiles.Any(file =>
                        file.VideoResolution != null && EF.Functions.Like(file.VideoResolution, searchPattern)))
                ) &&
                (!year.HasValue || x.Year == year.Value) &&
                (resolutionFilter == null || x.MediaFiles.Any(file =>
                    file.VideoResolution != null && file.VideoResolution == resolutionFilter)),
            s => s.OrderBy(x => x.Title),
            includeProperties: nameof(Movie.MediaFiles))).ToList();
        result.Movies = movies.Take(100);
        result.TotalMoviesMatching = movies.Count();

        var tvshows = (await _unitOfWork.TvShowRepository.Get(x =>
                (
                    searchPattern == null ||
                    EF.Functions.Like(x.Title, searchPattern) ||
                    x.Episodes.Any(episode => EF.Functions.Like(episode.Title, searchPattern)) ||
                    (yearFromSearch.HasValue && x.Episodes.Any(episode => episode.Year == yearFromSearch.Value)) ||
                    (searchLooksLikeResolution && x.Episodes.Any(episode =>
                        episode.MediaFiles.Any(file => file.VideoResolution != null &&
                                                       EF.Functions.Like(file.VideoResolution, searchPattern))))
                ) &&
                (!year.HasValue || x.Episodes.Any(episode => episode.Year == year.Value)) &&
                (resolutionFilter == null || x.Episodes.Any(episode =>
                    episode.MediaFiles.Any(file => file.VideoResolution != null &&
                                                   file.VideoResolution == resolutionFilter))),
            s => s.OrderBy(x => x.Title),
            nameof(TvShow.Episodes))).ToList();
        result.TvShows = tvshows.Take(25);
        result.TotalTvShowsMatching = tvshows.Count();

        var episodes = (await _unitOfWork.EpisodeRepository.Get(x =>
                (
                    searchPattern == null ||
                    EF.Functions.Like(x.Title, searchPattern) ||
                    EF.Functions.Like(x.TvShow.Title, searchPattern) ||
                    (yearFromSearch.HasValue && x.Year == yearFromSearch.Value) ||
                    (searchLooksLikeResolution && x.MediaFiles.Any(file =>
                        file.VideoResolution != null && EF.Functions.Like(file.VideoResolution, searchPattern)))
                ) &&
                (!year.HasValue || x.Year == year.Value) &&
                (resolutionFilter == null || x.MediaFiles.Any(file =>
                    file.VideoResolution != null && file.VideoResolution == resolutionFilter)),
            s => s.OrderBy(x => x.TvShow.Title)
                .ThenBy(x => x.SeasonNumber)
                .ThenBy(x => x.EpisodeNumber),
            includeProperties: nameof(Episode.TvShow) + "," + nameof(Episode.MediaFiles))).ToList();
        result.Episodes = episodes.Take(100);
        result.TotalEpisodesMatching = episodes.Count();

        return result;
    }

    private static string? ToLikePattern(string? searchTerm)
    {
        if (string.IsNullOrWhiteSpace(searchTerm))
            return null;

        var escaped = searchTerm.Trim('%');
        return $"%{escaped}%";
    }

    private static bool LooksLikeResolution(string searchTerm)
    {
        return searchTerm.Contains('p', StringComparison.OrdinalIgnoreCase) ||
               searchTerm.Contains('k', StringComparison.OrdinalIgnoreCase);
    }

    private static int GetResolutionRank(string resolution)
    {
        if (resolution.Contains("8k", StringComparison.OrdinalIgnoreCase))
            return 8000;
        if (resolution.Contains("4k", StringComparison.OrdinalIgnoreCase))
            return 4000;

        var digits = new string(resolution.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var value) ? value : 0;
    }
}
