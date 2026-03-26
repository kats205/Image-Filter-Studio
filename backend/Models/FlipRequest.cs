using Microsoft.AspNetCore.Http;

namespace backend.Models;

public class FlipRequest
{
    public required string ImageId { get; set; }
    public required string Direction { get; set; } // "horizontal" or "vertical"
    public IFormFile? SourceImage { get; set; }
    public bool Preview { get; set; }
}
