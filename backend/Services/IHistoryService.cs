using backend.Models;

namespace backend.Services;

/// <summary>
/// Interface quản lý lịch sử chỉnh sửa ảnh (Undo/Redo)
/// </summary>
public interface IHistoryService
{
    /// <summary>
    /// Lấy danh sách lịch sử thao tác của một hình ảnh
    /// </summary>
    Task<List<FilterHistory>> GetHistoryAsync(string imageId);

    /// <summary>
    /// Thêm một lịch sử thao tác vào DB
    /// </summary>
    Task AddActionAsync(string imageId, string actionName, float? intensity, string? parameters = null);
}
