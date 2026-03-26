using backend.Data;
using Microsoft.EntityFrameworkCore;

namespace backend.Services;

/// <summary>
/// Background Service chạy ngầm chạy định kỳ để dọn dẹp các ảnh cũ hơn 24 giờ.
/// Kế thừa BackgroundService từ .NET Hosted Service.
/// </summary>
public class StorageCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<StorageCleanupService> _logger;
    private readonly string _uploadPath;

    public StorageCleanupService(IServiceProvider serviceProvider, ILogger<StorageCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        // Giả định thư mục Storage/uploads theo root
        _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "uploads");
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Storage Cleanup Service is starting.");

        // Chạy định kỳ mỗi 1 giờ
        using var timer = new PeriodicTimer(TimeSpan.FromHours(1));

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await CleanupOldFilesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi xảy ra trong quá trình dọn dẹp Storage Cleanup.");
            }
        }
    }

    private async Task CleanupOldFilesAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Bắt đầu quy trình kiểm tra và quét dọn các file cũ...");

        // Do AppDbContext là Scoped Service, còn BackgroundService là Singleton nên ta phải CreateScope
        using var scope = _serviceProvider.CreateScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Lấy điều kiện là cũ hơn 24 giờ
        var threshold = DateTime.UtcNow.AddHours(-24); 

        var oldHistories = await dbContext.FilterHistories
            .Where(h => h.CreatedAt < threshold)
            .ToListAsync(stoppingToken);

        if (!oldHistories.Any())
        {
            _logger.LogInformation("Không tìm thấy tệp cũ nào cần xóa.");
            return;
        }

        // Liệt kê các UUID / file Name để xóa từ DB (Distinct để tránh xóa 1 file nhiều lần)
        var oldImageIds = oldHistories.Select(h => h.ImageId).Distinct().ToList();

        int filesDeleted = 0;

        foreach (var imageId in oldImageIds)
        {
            var filePath = Path.Combine(_uploadPath, imageId);
            
            // Tìm và xóa tệp tin vật lý tương ứng trên đĩa cứng máy chủ
            if (File.Exists(filePath))
            {
                try
                {
                    File.Delete(filePath);
                    filesDeleted++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, $"Không thể xóa file vật lý: {filePath}");
                }
            }
        }

        // Quét trong Database các bản ghi có CreatedAt cũ hơn 24 giờ và Xóa các bản ghi đó
        dbContext.FilterHistories.RemoveRange(oldHistories);
        await dbContext.SaveChangesAsync(stoppingToken);

        _logger.LogInformation($"Storage cleanup hoàn tất. Xóa thành công {filesDeleted} file vật lý và {oldHistories.Count} bản ghi DB.");
    }
}
