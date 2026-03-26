using backend.Services;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

/// <summary>
/// Controller xử lý History API hỗ trợ Undo/Redo cho ứng dụng Frontend
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class HistoryController : ControllerBase
{
    private readonly IHistoryService _historyService;

    // Utilize Dependency Injection để gọi IHistoryService
    public HistoryController(IHistoryService historyService)
    {
        _historyService = historyService;
    }

    /// <summary>
    /// API Endpoint: GET /api/history/{imageId}
    /// Logic: Trả về danh sách lịch sử của imageId đó, sắp xếp theo CreatedAt tăng dần để Frontend có thể vẽ lại Timeline.
    /// </summary>
    [HttpGet("{imageId}")]
    public async Task<IActionResult> GetHistory(string imageId)
    {
        if (string.IsNullOrWhiteSpace(imageId))
        {
            return BadRequest("ImageId không hợp lệ.");
        }

        var historyList = await _historyService.GetHistoryAsync(imageId);
        return Ok(historyList);
    }
}
