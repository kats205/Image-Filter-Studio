namespace backend.Models;

public class FlipRequest
{
    public required string ImageId { get; set; }
    public required string Direction { get; set; } // "horizontal" or "vertical"
}
