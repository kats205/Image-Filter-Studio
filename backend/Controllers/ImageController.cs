using Microsoft.AspNetCore.Mvc;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using System;
using Microsoft.AspNetCore.Http;
using backend.Models;
using backend.Services;

namespace backend.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class ImageController : ControllerBase
    {
        private readonly string _uploadPath = Path.Combine(Directory.GetCurrentDirectory(), "Storage", "uploads");

        public ImageController()
        {
            if (!Directory.Exists(_uploadPath)) Directory.CreateDirectory(_uploadPath);
        }

        [HttpPost("upload")]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            if (file == null || file.Length == 0) 
            {
                return BadRequest("Vui lòng tải lên một file ảnh.");
            }

            // Kiểm tra dung lượng tối đa 10MB
            const long maxFileSize = 10 * 1024 * 1024; // 10MB
            if (file.Length > maxFileSize)
            {
                return BadRequest("Dung lượng file vượt quá giới hạn 10MB.");
            }

            // Kiểm tra MIME type (chỉ cho phép các định dạng ảnh phổ biến)
            var allowedMimeTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp", "image/bmp", "image/svg+xml" };
            if (string.IsNullOrEmpty(file.ContentType) || !allowedMimeTypes.Contains(file.ContentType.ToLowerInvariant()))
            {
                return BadRequest("Sai định dạng. Chỉ chấp nhận các file ảnh hợp lệ.");
            }

            var fileId = Guid.NewGuid().ToString();
            var fileName = $"{fileId}{Path.GetExtension(file.FileName)}";
            var filePath = Path.Combine(_uploadPath, fileName);

            using (var stream = new FileStream(filePath, FileMode.Create))
            {
                await file.CopyToAsync(stream);
            }

            return Ok(new
            {
                imageId = fileId,
                fileName = fileName,
                originalUrl = $"/Storage/uploads/{fileName}"
            });
        }

        [HttpGet("download/{imageId}")]
        public IActionResult DownloadImage(string imageId)
        {
            if (string.IsNullOrWhiteSpace(imageId))
            {
                return BadRequest("ImageId không hợp lệ.");
            }

            // Lấy safe name để tránh Path Traversal (vd: ../../etc/passwd)
            var safeImageId = Path.GetFileName(imageId);
            var filePath = Path.Combine(_uploadPath, safeImageId);

            if (!System.IO.File.Exists(filePath))
            {
                // Xử lý 404 Not Found theo yêu cầu
                return NotFound($"Không tìm thấy file ảnh với ID: {imageId} trong Storage/.");
            }

            // Trả file PNG dưới dạng attachment (ép kiểu file download)
            var stream = new FileStream(filePath, FileMode.Open, FileAccess.Read);
            return File(stream, "image/png", safeImageId);
        }

        [HttpPost("transform")]
        public async Task<IActionResult> TransformImage([FromBody] TransformRequest request, [FromServices] IImageProcessingService imageService, [FromServices] IHistoryService historyService)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.ImageId) || string.IsNullOrWhiteSpace(request.Rotation))
                return BadRequest("Invalid request.");

            var safeImageId = Path.GetFileName(request.ImageId);
            var filePath = Path.Combine(_uploadPath, safeImageId);

            if (!System.IO.File.Exists(filePath))
                return NotFound($"Không tìm thấy file ảnh với ID: {request.ImageId}");

            try
            {
                var bytes = await imageService.ApplyTransformAsync(filePath, request.Rotation);
                await historyService.AddActionAsync(request.ImageId, "Transform", null, request.Rotation);
                return File(bytes, "image/png");
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("flip")]
        public async Task<IActionResult> FlipImage([FromBody] FlipRequest request, [FromServices] IImageProcessingService imageService, [FromServices] IHistoryService historyService)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.ImageId) || string.IsNullOrWhiteSpace(request.Direction))
                return BadRequest("Invalid request.");

            var safeImageId = Path.GetFileName(request.ImageId);
            var filePath = Path.Combine(_uploadPath, safeImageId);

            if (!System.IO.File.Exists(filePath))
                return NotFound($"Không tìm thấy file ảnh với ID: {request.ImageId}");

            try
            {
                var bytes = await imageService.ApplyFlipAsync(filePath, request.Direction);
                await historyService.AddActionAsync(request.ImageId, "Flip", null, request.Direction);
                return File(bytes, "image/png");
            }
            catch (ArgumentException ex)
            {
                return BadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }

        [HttpPost("crop")]
        public async Task<IActionResult> CropImage([FromBody] CropRequest request, [FromServices] IImageProcessingService imageService, [FromServices] IHistoryService historyService)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.ImageId) || request.Width <= 0 || request.Height <= 0)
                return BadRequest("Invalid crop request.");

            var safeImageId = Path.GetFileName(request.ImageId);
            var filePath = Path.Combine(_uploadPath, safeImageId);

            if (!System.IO.File.Exists(filePath))
                return NotFound($"Không tìm thấy file ảnh với ID: {request.ImageId}");

            try
            {
                var bytes = await imageService.ApplyCropAsync(filePath, request.X, request.Y, request.Width, request.Height);
                await historyService.AddActionAsync(request.ImageId, "Crop", null, $"{{\"x\": {request.X}, \"y\": {request.Y}, \"width\": {request.Width}, \"height\": {request.Height}}}");
                return File(bytes, "image/png");
            }
            catch (Exception ex)
            {
                return StatusCode(500, ex.Message);
            }
        }
    }
}
