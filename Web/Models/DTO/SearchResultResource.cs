namespace Web.Models.DTO;

public class SearchResultResource
{
    public int TotalMoviesMatching { get; set; }
    public IEnumerable<Movie> Movies { get; set; } = Array.Empty<Movie>();
    public int TotalTvShowsMatching { get; set; }
    public IEnumerable<TvShow> TvShows { get; set; } = Array.Empty<TvShow>();
    public int TotalEpisodesMatching { get; set; }
    public IEnumerable<Episode> Episodes { get; set; } = Array.Empty<Episode>();
    public int TotalPlaylistsMatching { get; set; }
    public IEnumerable<PlaylistResource> Playlists { get; set; } = Array.Empty<PlaylistResource>();
}
