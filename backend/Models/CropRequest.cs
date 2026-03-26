using Microsoft.AspNetCore.Http;

namespace backend.Models;

public class CropRequest
{
    public required string ImageId { get; set; }
    public int X { get; set; }
    public int Y { get; set; }
    public int Width { get; set; }
    public int Height { get; set; }
    public IFormFile? SourceImage { get; set; }
    public bool Preview { get; set; }
}
