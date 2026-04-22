namespace Web.Models.DTO;

public class SyncLogPageResource
{
    public IReadOnlyCollection<SyncLogEntryResource> Items { get; set; } = Array.Empty<SyncLogEntryResource>();
    public int TotalItems { get; set; }
    public bool HasMore { get; set; }
}
