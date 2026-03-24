using backend.Models;

namespace backend.Services;

public interface IImageProcessingService
{
    Task<byte[]> ApplyFilterAsync(string filePath, string filterName, float? intensity);
    Task<byte[]> ApplyTransformAsync(string filePath, string transformType);
    Task<byte[]> ApplyCropAsync(string filePath, int x, int y, int width, int height);
    IEnumerable<FilterInfo> GetAvailableFilters();
}
