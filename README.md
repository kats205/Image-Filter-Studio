# Image Filter Studio

**Image Filter Studio** is a professional web-based image processing application built for the **API Programming (C#, C++)** course. It demonstrates how to build a modern, decoupled architecture using **ASP.NET Core 8** and **Vanilla JavaScript + Tailwind CSS**, leveraging the power of **SkiaSharp** for high-performance graphics.

## 🚀 Overview

- **Subject:** API Programming - Basic Graphics
- **Core Concept:** Web-based image editing via RESTful APIs.
- **Goal:** To bridge the gap between classic GDI graphics theories and modern web-based API implementations.

## 🛠️ Tech Stack

### Backend
- **Framework:** ASP.NET Core 8.0 LTS (Minimal API / Controller)
- **Language:** C# 12
- **Graphics Library:** SkiaSharp (2.88.x)
- **Database:** SQL Server + EF Core (Required for Storage Cleanup & Session Recovery)
- **API Documentation:** Swagger / OpenAPI

### Frontend
- **Markup:** HTML5
- **Styling:** Tailwind CSS v3 (via CDN — no build step required)
- **Logic:** Vanilla JavaScript (ES6+), Fetch API
- **Preview:** FileReader API for instant local preview

## 📂 Project Structure

```text
image-filter-studio/
├── backend/                  # ASP.NET Core 8 Web API (:5000)
│   ├── Controllers/          # Image and Filter API Endpoints
│   ├── Services/             # Business logic (SkiaSharp implementation)
│   ├── Models/               # Request/Response DTOs
│   ├── Data/                 # SQL Server Context
│   └── Storage/              # uploads/ for source, output/ for results
└── frontend/                 # Static HTML/Tailwind/JS (:5500)
    ├── assets/               # Static assets
    ├── js/                   # api.js (Fetch), ui.js (DOM), app.js (Entry)
    └── index.html            # Main UI (Tailwind CSS via CDN)
```

## 📡 API Reference

| Endpoint | Method | Content-Type | Description |
| :--- | :--- | :--- | :--- |
| `/api/image/upload` | POST | `multipart/form-data` | Upload images (.jpg, .png. max 10MB) |
| `/api/image/filter` | POST | `application/json` | Apply filter with intensity (0-10) |
| `/api/image/download/{id}`| GET | - | Download processed image as PNG |
| `/api/filter/list` | GET | - | Get list of available filters and ranges |

## ✨ Key Features

### Core Filters (via SkiaSharp)
- **Grayscale:** Luma-based conversion.
- **Blur:** Gaussian blur using `SKImageFilter`.
- **Brightness:** RGB factor scaling based on intensity.
- **Sepia:** Classic color matrix transformation.
- **Sharpen:** 3x3 Convolution kernel.
- **Invert:** Negative color transformation.

### Advanced Features (Plus Points)
- **Crop/Resize:** Subset extraction via `SKBitmap`.
- **Rotate/Flip:** 90/180/270 degree rotation and mirroring.
### Database Features / Data Management
- **Session Recovery:** Resume draft edits across page reloads via SQL Server.
- **Storage Cleanup:** Auto-delete images older than 24h using `CreatedAt` timestamp to prevent disk bloat.
- **Academic Score (Plus Point):** Demonstrating real-world data tracking over EF Core.

## 🎓 Academic Connection (GDI vs SkiaSharp)

| GDI Concept (Theory) | SkiaSharp Equivalent |
| :--- | :--- |
| `GetDC()` / `ReleaseDC()` | `SKSurface` / `SKCanvas` |
| `CreatePen()` / `BRUSH` | `SKPaint` |
| `SetPixel()` / `GetPixel()` | `bitmap.SetPixel()` / `GetPixel()` |
| `BitBlt()` | `canvas.DrawBitmap()` |

## 📄 License

[MIT License](LICENSE)

---

