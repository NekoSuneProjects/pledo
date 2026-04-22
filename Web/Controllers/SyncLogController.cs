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
    public async Task<SyncLogPageResource> Get([FromQuery] int skip = 0, [FromQuery] int take = 24)
    {
        return await _syncLogService.GetEntries(skip, take);
    }
}
