using System;

namespace backend.Models;

public class FilterHistory
{
    public int Id { get; set; }
    public required string ImageId { get; set; }
    public required string Filter { get; set; }
    public float? Intensity { get; set; }
    public DateTime CreatedAt { get; set; }
}
