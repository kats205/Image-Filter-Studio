using Microsoft.AspNetCore.Http;

namespace backend.Models;

public class TransformRequest
{
    public required string ImageId { get; set; }
    public required string Rotation { get; set; } // "90", "180", "270", "flipH", "flipV"
    public IFormFile? SourceImage { get; set; }
    public bool Preview { get; set; }
}
