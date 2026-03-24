using backend.Models;
using SkiaSharp;
using System.IO;

namespace backend.Services;

public class ImageProcessingService : IImageProcessingService
{
    // Define the available filters
    private readonly List<FilterInfo> _availableFilters = new()
    {
        new FilterInfo { Name = "Grayscale", HasSlider = false, MinIntensity = 0, MaxIntensity = 0 },
        new FilterInfo { Name = "Sepia", HasSlider = false, MinIntensity = 0, MaxIntensity = 0 },
        new FilterInfo { Name = "Invert", HasSlider = false, MinIntensity = 0, MaxIntensity = 0 },
        new FilterInfo { Name = "Blur", HasSlider = true, MinIntensity = 0, MaxIntensity = 10 },
        new FilterInfo { Name = "Brightness", HasSlider = true, MinIntensity = 0, MaxIntensity = 10 },
        new FilterInfo { Name = "Sharpen", HasSlider = true, MinIntensity = 0, MaxIntensity = 10 }
    };

    public IEnumerable<FilterInfo> GetAvailableFilters()
    {
        return _availableFilters;
    }

    public async Task<byte[]> ApplyFilterAsync(string filePath, string filterName, float? intensity)
    {
        if (!File.Exists(filePath))
        {
            throw new FileNotFoundException($"Image at path '{filePath}' not found.");
        }

        // Validate filter
        var filterInfo = _availableFilters.FirstOrDefault(f => f.Name.Equals(filterName, StringComparison.OrdinalIgnoreCase));
        if (filterInfo == null)
        {
            throw new ArgumentException($"Filter '{filterName}' is not supported.");
        }

        byte[] fileBytes = await File.ReadAllBytesAsync(filePath);

        using var bitmap = SKBitmap.Decode(fileBytes);
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
        switch (filterName)
        {
            case "grayscale":
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    0.2126f, 0.7152f, 0.0722f, 0, 0,
                    0.2126f, 0.7152f, 0.0722f, 0, 0,
                    0.2126f, 0.7152f, 0.0722f, 0, 0,
                    0,       0,       0,       1, 0
                });
                break;
            case "sepia":
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    0.393f, 0.769f, 0.189f, 0, 0,
                    0.349f, 0.686f, 0.168f, 0, 0,
                    0.272f, 0.534f, 0.131f, 0, 0,
                    0,      0,      0,      1, 0
                });
                break;
            case "invert":
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    -1,  0,  0,  0, 255,
                     0, -1,  0,  0, 255,
                     0,  0, -1,  0, 255,
                     0,  0,  0,  1,   0
                });
                break;
            case "blur":
                // 0-10 intensity. Max blur sigma = 20
                float sigma = (intensity / 10f) * 20f;
                if (sigma > 0)
                {
                    paint.ImageFilter = SKImageFilter.CreateBlur(sigma, sigma);
                }
                break;
            case "brightness":
                // Intensity 0-10, where 5 is original (1.0). Limit: 0 to 2.0. Scale (Intensity / 5)
                float brightnessScale = intensity / 5f;
                paint.ColorFilter = SKColorFilter.CreateColorMatrix(new float[]
                {
                    brightnessScale, 0, 0, 0, 0,
                    0, brightnessScale, 0, 0, 0,
                    0, 0, brightnessScale, 0, 0,
                    0, 0, 0, 1, 0
                });
                break;
            case "sharpen":
                float k = (intensity / 10f); // 0 to 1
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

    public async Task<byte[]> ApplyTransformAsync(string filePath, string transformType)
    {
        if (!File.Exists(filePath)) throw new FileNotFoundException($"Image at path '{filePath}' not found.");
        byte[] fileBytes = await File.ReadAllBytesAsync(filePath);
        using var bitmap = SKBitmap.Decode(fileBytes) ?? throw new InvalidOperationException("Failed to decode image.");
        
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

    public async Task<byte[]> ApplyCropAsync(string filePath, int x, int y, int width, int height)
    {
        if (!File.Exists(filePath)) throw new FileNotFoundException($"Image at path '{filePath}' not found.");
        byte[] fileBytes = await File.ReadAllBytesAsync(filePath);
        using var bitmap = SKBitmap.Decode(fileBytes) ?? throw new InvalidOperationException("Failed to decode image.");

        var rect = new SKRectI(x, y, x + width, y + height);
        using var croppedSubset = new SKBitmap();
        bitmap.ExtractSubset(croppedSubset, rect);

        using var data = croppedSubset.Encode(SKEncodedImageFormat.Png, 100);
        return data.ToArray();
    }
}
