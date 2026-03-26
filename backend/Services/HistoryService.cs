using backend.Data;
using backend.Models;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Service quản lý lịch sử thao tác ảnh, gọi DbContext để lưu xuống DB.
/// Phân tách Controller và Data Layer theo chuẩn cấu trúc Clean.
/// </summary>
public class HistoryService : IHistoryService
{
    private readonly AppDbContext _dbContext;

    public HistoryService(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public async Task<List<FilterHistory>> GetHistoryAsync(string imageId)
    {
        // Lấy lịch sử theo imageId, sắp xếp tăng dần theo thời gian tạo để Frontend vẽ Timeline.
        return await _dbContext.FilterHistories
            .Where(h => h.ImageId == imageId)
            .OrderBy(h => h.CreatedAt)
            .ToListAsync();
    }

    public async Task AddActionAsync(string imageId, string actionName, float? intensity, string? parameters = null)
    {
        var history = new FilterHistory
        {
            ImageId = imageId,
            Filter = actionName,
            Intensity = intensity,
            Parameters = parameters, // Lưu JSON hoặc Data string nếu cần
            CreatedAt = DateTime.UtcNow
        };

        _dbContext.FilterHistories.Add(history);
        await _dbContext.SaveChangesAsync();
    }
}
