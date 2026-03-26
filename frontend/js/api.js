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
