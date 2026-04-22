namespace Web.Models.DTO;

public class SyncLogEntryResource
{
    public DateTimeOffset Timestamp { get; set; }
    public string Level { get; set; } = "info";
    public string EventType { get; set; } = "";
    public string Message { get; set; } = "";
    public string? ServerId { get; set; }
    public string? ServerName { get; set; }
    public string? MediaType { get; set; }
    public string? MediaName { get; set; }
}
