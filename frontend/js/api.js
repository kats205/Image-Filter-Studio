const BASE_URL = 'http://localhost:5000/api'; // Đảm bảo port đúng với backend

async function uploadImage(file) {
    const formData = new FormData();
    formData.append('image', file);

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

async function applyFilter(imageId, filterName, intensity) {
    const response = await fetch(`${BASE_URL}/image/filter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, filter: filterName, intensity })
    });

    if (!response.ok) {
        throw new Error('Áp dụng bộ lọc thất bại');
    }

    return await response.blob();
}

async function downloadImage(imageId) {
    const response = await fetch(`${BASE_URL}/image/download/${encodeURIComponent(imageId)}`);
    if (!response.ok) {
        throw new Error('Không thể tải ảnh về từ server');
    }
    return await response.blob();
}

async function cropImage(imageId, x, y, width, height) {
    const response = await fetch(`${BASE_URL}/image/crop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, x, y, width, height })
    });

    if (!response.ok) {
        throw new Error('Cắt ảnh thất bại');
    }

    return await response.blob();
}
