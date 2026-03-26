using backend.Models;
using SkiaSharp;
using System.IO;

namespace backend.Services;

public class ImageProcessingService : IImageProcessingService
{
    private readonly List<FilterInfo> _availableFilters = new()
    {
        new FilterInfo { Name = "Grayscale", HasSlider = true, MinIntensity = 0, MaxIntensity = 100, DefaultIntensity = 0 },
        new FilterInfo { Name = "Sepia", HasSlider = true, MinIntensity = 0, MaxIntensity = 100, DefaultIntensity = 0 },
        new FilterInfo { Name = "Invert", HasSlider = true, MinIntensity = 0, MaxIntensity = 100, DefaultIntensity = 0 },
        new FilterInfo { Name = "Blur", HasSlider = true, MinIntensity = 0, MaxIntensity = 100, DefaultIntensity = 0 },
        new FilterInfo { Name = "Brightness", HasSlider = true, MinIntensity = -100, MaxIntensity = 100, DefaultIntensity = 0 },
        new FilterInfo { Name = "Sharpen", HasSlider = true, MinIntensity = 0, MaxIntensity = 100, DefaultIntensity = 0 }
    };

    public IEnumerable<FilterInfo> GetAvailableFilters()
    {
        return _availableFilters;
    }

    public async Task<byte[]> ApplyFilterAsync(byte[] sourceBytes, string filterName, float? intensity)
    {
        await Task.Yield();

        // Validate filter
        var filterInfo = _availableFilters.FirstOrDefault(f => f.Name.Equals(filterName, StringComparison.OrdinalIgnoreCase));
        if (filterInfo == null)
        {
            throw new ArgumentException($"Filter '{filterName}' is not supported.");
        }

        using var bitmap = SKBitmap.Decode(sourceBytes) ?? throw new InvalidOperationException("Failed to decode image.");
        if (bitmap == null)
        {
            throw new InvalidOperationException("Failed to decode image.");
        }

        using var surface = SKSurface.Create(new SKImageInfo(bitmap.Width, bitmap.Height));
        using var canvas = surface.Canvas;

        using var paint = new SKPaint();

        // Apply filter logic
        ApplyFilterToPaint(paint, filterName.ToLower(), intensity ?? 0);

        // Draw bitmap with filter
        canvas.DrawBitmap(bitmap, 0, 0, paint);
        canvas.Flush();

        using var snap = surface.Snapshot();
        using var data = snap.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    private void ApplyFilterToPaint(SKPaint paint, string filterName, float intensity)
    {
        // Bỏ giới hạn cũ 0-100 vì có những filter như Brightness là âm
        intensity = Math.Clamp(intensity, -100f, 100f);
        float t = intensity / 100f; // Hệ số biểu diễn tỉ lệ (-1.0 đến 1.0 hoặc 0.0 đến 1.0 tùy min/max)

        switch (filterName)
        {
            case "grayscale":
                float rR = (1 - t) + t * 0.2126f;
                float rG = t * 0.7152f;
                float rB = t * 0.0722f;

                float gR = t * 0.2126f;
                float gG = (1 - t) + t * 0.7152f;
                float gB = t * 0.0722f;

                float bR = t * 0.2126f;
                float bG = t * 0.7152f;
                float bB = (1 - t) + t * 0.0722f;

                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    rR, rG, rB, 0, 0,
                    gR, gG, gB, 0, 0,
                    bR, bG, bB, 0, 0,
                    0,  0,  0,  1, 0
                });
                break;
            case "sepia":
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    (1 - t) + t * 0.393f, t * 0.769f,           t * 0.189f,           0, 0,
                    t * 0.349f,           (1 - t) + t * 0.686f, t * 0.168f,           0, 0,
                    t * 0.272f,           t * 0.534f,           (1 - t) + t * 0.131f, 0, 0,
                    0,                    0,                    0,                    1, 0
                });
                break;
            case "invert":
                float inv = 1 - 2 * Math.Abs(t); 
                float add = 1.0f * Math.Abs(t);   
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    inv, 0,   0,   0, add,
                    0,   inv, 0,   0, add,
                    0,   0,   inv, 0, add,
                    0,   0,   0,   1, 0
                });
                break;
            case "blur":
                // Mức blur tối đa: sigma = 20
                float sigma = t * 20f;
                if (sigma > 0)
                {
                    paint.ImageFilter = SKImageFilter.CreateBlur(sigma, sigma);
                }
                break;
            case "brightness":
                // Thay vì cộng bù (Additive) gây cháy trắng/đen đặc, dùng Hệ số nhân (Scale) để bảo toàn chi tiết ảnh.
                // Scale từ 0.5x (-100) đến 1.5x (+100)
                float scale = 1.0f + (t * 0.5f);
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    scale, 0,     0,     0, 0,
                    0,     scale, 0,     0, 0,
                    0,     0,     scale, 0, 0,
                    0,     0,     0,     1, 0
                });
                break;
            case "sharpen":
                float k = t; // k từ 0 đến 1.0
                float center = 1f + 4f * k;
                float edge = -k;

                var kernel = new float[] 
                {
                     0,    edge,  0,
                     edge, center, edge,
                     0,    edge,  0
                };
                
                paint.ImageFilter = SKImageFilter.CreateMatrixConvolution(
                    new SKSizeI(3, 3), 
                    kernel, 
                    1f, 
                    0f, 
                    new SKPointI(1, 1), 
                    SKShaderTileMode.Repeat, 
                    false);
                break;
            default:
                break;
        }
    }

    public async Task<byte[]> ApplyTransformAsync(byte[] sourceBytes, string transformType)
    {
        await Task.Yield(); // satisfy async
        using var bitmap = SKBitmap.Decode(sourceBytes) ?? throw new InvalidOperationException("Failed to decode image.");
        
        int newWidth = bitmap.Width;
        int newHeight = bitmap.Height;

        if (transformType == "90" || transformType == "270")
        {
            newWidth = bitmap.Height;
            newHeight = bitmap.Width;
        }

        using var surface = SKSurface.Create(new SKImageInfo(newWidth, newHeight));
        using var canvas = surface.Canvas;

        canvas.Clear(SKColors.Transparent);
        if (transformType == "90")
        {
            canvas.Translate(newWidth, 0);
            canvas.RotateDegrees(90);
        }
        else if (transformType == "180")
        {
            canvas.Translate(newWidth, newHeight);
            canvas.RotateDegrees(180);
        }
        else if (transformType == "270")
        {
            canvas.Translate(0, newHeight);
            canvas.RotateDegrees(270);
        }
        else if (transformType == "flipH")
        {
            canvas.Translate(newWidth, 0);
            canvas.Scale(-1, 1);
        }
        else if (transformType == "flipV")
        {
            canvas.Translate(0, newHeight);
            canvas.Scale(1, -1);
        }

        canvas.DrawBitmap(bitmap, 0, 0);
        canvas.Flush();

        using var snap = surface.Snapshot();
        using var data = snap.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    public async Task<byte[]> ApplyFlipAsync(byte[] sourceBytes, string direction)
    {
        await Task.Yield(); // satisfy async
        using var bitmap = SKBitmap.Decode(sourceBytes) ?? throw new InvalidOperationException("Failed to decode image.");
        
        using var surface = SKSurface.Create(new SKImageInfo(bitmap.Width, bitmap.Height));
        using var canvas = surface.Canvas;

        canvas.Clear(SKColors.Transparent);
        if (direction.Equals("horizontal", StringComparison.OrdinalIgnoreCase))
        {
            canvas.Translate(bitmap.Width, 0);
            canvas.Scale(-1, 1);
        }
        else if (direction.Equals("vertical", StringComparison.OrdinalIgnoreCase))
        {
            canvas.Translate(0, bitmap.Height);
            canvas.Scale(1, -1);
        }
        else 
        {
            throw new ArgumentException("Invalid flip direction. Use 'horizontal' or 'vertical'.");
        }

        canvas.DrawBitmap(bitmap, 0, 0);
        canvas.Flush();

        using var snap = surface.Snapshot();
        using var data = snap.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }

    public async Task<byte[]> ApplyCropAsync(byte[] sourceBytes, int x, int y, int width, int height)
    {
        await Task.Yield(); // satisfy async
        using var bitmap = SKBitmap.Decode(sourceBytes) ?? throw new InvalidOperationException("Failed to decode image.");

        var rect = new SKRectI(x, y, x + width, y + height);
        using var croppedSubset = new SKBitmap();
        bitmap.ExtractSubset(croppedSubset, rect);

        using var data = croppedSubset.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
