document.addEventListener('DOMContentLoaded', async () => {
    const imageInput = document.getElementById('imageInput');

    imageInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Phase 1: Hiển thị Preview ảnh gốc
        showPreview(file);
        
        try {
            // Phase 1: Gọi API upload file lên Backend
            console.log('Đang tải ảnh lên...');
            const data = await uploadImage(file);
            console.log('Upload thành công:', data);
            
            // Lưu imageId để sử dụng cho filter sau này
            localStorage.setItem('currentImageId', data.imageId);
            
            // Phase 2: Sau khi upload thành công, sẽ hiển thị nút filter
            // const filters = await getFilterList();
            // renderFilters(filters);
            // controlsSection.classList.remove('hidden');
        } catch (error) {
            showToast(error.message);
        }
    });

    // Event listeners cho các tính năng khác sẽ được bổ sung ở Phase 2 & 3
});
