/**
 * createPreviewBlob — Thu nhỏ & nén blob xuống thumbnail chất lượng thấp.
 * @param {Blob} blob     - ảnh gốc (bất kỳ định dạng)
 * @param {number} maxDim - cạnh dài tối đa (px), mặc định 480
 * @param {number} quality- JPEG quality 0-1, mặc định 0.55
 * @returns {Promise<Blob>}
 */
async function createPreviewBlob(blob, maxDim = 480, quality = 0.55) {
    return new Promise((resolve) => {
        const img = new Image();
        const src = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(src);
            const scale = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
            const w = Math.round(img.naturalWidth  * scale);
            const h = Math.round(img.naturalHeight * scale);
            const canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(src); resolve(blob); }; // fallback: gửi gốc
        img.src = src;
    });
}

/**
 * compressBlob — Nén blob theo quality/scale cho Preview Download.
 * @param {Blob} blob
 * @param {number} scale   - 0-1, tỉ lệ thu nhỏ kích thước (1 = giữ nguyên)
 * @param {number} quality - JPEG quality 0-1
 */
async function compressBlob(blob, scale = 1, quality = 0.65) {
    return new Promise((resolve) => {
        const img = new Image();
        const src = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(src);
            const w = Math.round(img.naturalWidth  * scale);
            const h = Math.round(img.naturalHeight * scale);
            const canvas = document.createElement('canvas');
            canvas.width  = w;
            canvas.height = h;
            canvas.getContext('2d').drawImage(img, 0, 0, w, h);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        img.onerror = () => { URL.revokeObjectURL(src); resolve(blob); };
        img.src = src;
    });
}

const BASE_URL = 'http://localhost:5000/api'; // Đảm bảo port đúng với backend

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${BASE_URL}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        throw new Error('Lỗi khi tải ảnh lên server');
    }

    return await response.json();
}

async function getFilterList() {
    const response = await fetch(`${BASE_URL}/filter/list`);
    if (!response.ok) {
        throw new Error('Không thể lấy danh sách filter từ server');
    }
    return await response.json();
}

async function getHistory(imageId) {
    const response = await fetch(`${BASE_URL}/history/${encodeURIComponent(imageId)}`);
    if (!response.ok) {
        throw new Error('Không thể tải lịch sử');
    }
    return await response.json();
}

async function applyFilter(imageId, filterName, intensity, sourceBlob = null, preview = false) {
    const formData = new FormData();
    formData.append('imageId', imageId);
    formData.append('filter', filterName);
    formData.append('intensity', intensity);
    formData.append('preview', preview);
    if (sourceBlob) formData.append('sourceImage', sourceBlob);

    const response = await fetch(`${BASE_URL}/image/filter`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Áp dụng bộ lọc thất bại');
    return await response.blob();
}

async function transformImage(imageId, rotation, sourceBlob = null, preview = false) {
    const formData = new FormData();
    formData.append('imageId', imageId);
    formData.append('rotation', rotation);
    formData.append('preview', preview);
    if (sourceBlob) formData.append('sourceImage', sourceBlob);

    const response = await fetch(`${BASE_URL}/image/transform`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Xoay ảnh thất bại');
    return await response.blob();
}

async function flipImage(imageId, direction, sourceBlob = null, preview = false) {
    const formData = new FormData();
    formData.append('imageId', imageId);
    formData.append('direction', direction);
    formData.append('preview', preview);
    if (sourceBlob) formData.append('sourceImage', sourceBlob);

    const response = await fetch(`${BASE_URL}/image/flip`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Lật ảnh thất bại');
    return await response.blob();
}

async function cropImage(imageId, x, y, width, height, sourceBlob = null, preview = false) {
    const formData = new FormData();
    formData.append('imageId', imageId);
    formData.append('x', x);
    formData.append('y', y);
    formData.append('width', width);
    formData.append('height', height);
    formData.append('preview', preview);
    if (sourceBlob) formData.append('sourceImage', sourceBlob);

    const response = await fetch(`${BASE_URL}/image/crop`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) throw new Error('Cắt ảnh thất bại');
    return await response.blob();
}

async function downloadImage(imageId) {
    const response = await fetch(`${BASE_URL}/image/download/${encodeURIComponent(imageId)}`);
    if (!response.ok) {
        throw new Error('Không thể tải ảnh về từ server');
    }
    return await response.blob();
}
