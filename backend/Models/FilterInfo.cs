namespace backend.Models;

public class FilterInfo
{
    public required string Name { get; set; }
    public bool HasSlider { get; set; }
    public float MinIntensity { get; set; }
    public float MaxIntensity { get; set; }
    public float DefaultIntensity { get; set; }
}
