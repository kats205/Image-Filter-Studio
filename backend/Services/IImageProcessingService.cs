using backend.Models;

namespace backend.Services;

public interface IImageProcessingService
{
    Task<byte[]> ApplyFilterAsync(byte[] sourceBytes, string filterName, float? intensity);
    Task<byte[]> ApplyTransformAsync(byte[] sourceBytes, string transformType);
    Task<byte[]> ApplyFlipAsync(byte[] sourceBytes, string direction);
    Task<byte[]> ApplyCropAsync(byte[] sourceBytes, int x, int y, int width, int height);
    IEnumerable<FilterInfo> GetAvailableFilters();
}
