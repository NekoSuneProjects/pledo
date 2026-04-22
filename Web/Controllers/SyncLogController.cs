using Microsoft.AspNetCore.Mvc;
using Web.Models.DTO;
using Web.Services;

namespace Web.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SyncLogController : ControllerBase
{
    private readonly ISyncLogService _syncLogService;

    public SyncLogController(ISyncLogService syncLogService)
    {
        _syncLogService = syncLogService;
    }

    [HttpGet]
    public async Task<IEnumerable<SyncLogEntryResource>> Get([FromQuery] int take = 100)
    {
        return await _syncLogService.GetRecentEntries(take);
    }
}
