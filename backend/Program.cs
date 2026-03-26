using backend.Data;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddCors(options => {
    options.AddPolicy("MyAllowSpecificOrigins",
        policy => {
            policy.WithOrigins("http://localhost:5500", "http://127.0.0.1:5500")
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

builder.Services.AddControllers();
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddScoped<backend.Services.IImageProcessingService, backend.Services.ImageProcessingService>();
builder.Services.AddScoped<backend.Services.IHistoryService, backend.Services.HistoryService>();
builder.Services.AddHostedService<backend.Services.StorageCleanupService>();
// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}
// Bỏ tính năng tự động Redirect sang HTTPS để tránh lỗi CORS 307 trên file API POST
// app.UseHttpsRedirection();
app.UseCors("MyAllowSpecificOrigins");

app.UseAuthorization();

app.MapControllers();

app.Run();
