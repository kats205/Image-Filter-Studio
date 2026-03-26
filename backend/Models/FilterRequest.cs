using Microsoft.AspNetCore.Http;

namespace backend.Models;

public class FilterRequest
{
    public required string ImageId { get; set; }
    public required string Filter { get; set; }
    public float? Intensity { get; set; }
    public IFormFile? SourceImage { get; set; }
    public bool Preview { get; set; }
}
