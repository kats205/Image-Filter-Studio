using backend.Models;
using backend.Services;
using backend.Data;
using Microsoft.AspNetCore.Mvc;

namespace backend.Controllers;

[ApiController]
[Route("api/[controller]")]
public class FilterController : ControllerBase
{
    private readonly IImageProcessingService _imageService;
    private readonly ILogger<FilterController> _logger;
    private readonly IHistoryService _historyService;
    private readonly string _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "uploads");

    public FilterController(IImageProcessingService imageService, ILogger<FilterController> logger, IHistoryService historyService)
    {
        _imageService = imageService;
        _logger = logger;
        _historyService = historyService;
    }

    [HttpGet("list")]
    public IActionResult GetFilters()
    {
        var filters = _imageService.GetAvailableFilters();
        return Ok(filters);
    }

    [HttpPost("/api/image/filter")]
    public async Task<IActionResult> ApplyFilter([FromBody] FilterRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.ImageId) || string.IsNullOrWhiteSpace(request.Filter))
        {
            return BadRequest("Invalid request.");
        }

        var fullPath = Path.Combine(_uploadPath, request.ImageId);

        if (!System.IO.File.Exists(fullPath))
        {
            return NotFound($"Không tìm thấy file ảnh với ID: {request.ImageId} trong thư mục uploads.");
        }

        try
        {
            var bytes = await _imageService.ApplyFilterAsync(fullPath, request.Filter, request.Intensity);
            
            await _historyService.AddActionAsync(request.ImageId, request.Filter, request.Intensity);

            return File(bytes, "image/png");
        }
        catch (FileNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing image filter.");
            return StatusCode(500, "An error occurred while processing the image.");
        }
    }
}
