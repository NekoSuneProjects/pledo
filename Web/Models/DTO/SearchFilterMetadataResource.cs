namespace Web.Models.DTO;

public class SearchFilterMetadataResource
{
    public IEnumerable<int> Years { get; set; } = Array.Empty<int>();
    public IEnumerable<string> Resolutions { get; set; } = Array.Empty<string>();
}
