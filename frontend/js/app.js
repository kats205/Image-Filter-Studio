document.addEventListener('DOMContentLoaded', async () => {
    // 1. Hook into UI image load
    window.onImageLoadedHook = async (file) => {
        // Phase 1: Hiển thị Preview ảnh gốc (handled in ui.js visually)
        
        try {
            // // Phase 1: Gọi API upload file lên Backend (Comment temporaily if backend not up)
            // console.log('Đang tải ảnh lên...');
            // const data = await uploadImage(file);
            // console.log('Upload thành công:', data);
            
            // // Lưu imageId để sử dụng cho filter sau này
            // localStorage.setItem('currentImageId', data.imageId);
            
            // Phase 2 logic: apply default settings or load filters dynamically
            console.log("Mock filter loading Phase 2");
            // const filters = await getFilterList();
            // renderFilters(filters);
            
        } catch (error) {
            console.error(error);
        }
    };

    // Filter UI selection logic (Mocking Phase 2 interactions)
    const filterOptions = document.querySelectorAll('.filter-option');
    const processedImage = document.getElementById('processed-image');
    
    filterOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            // Remove active classes
            filterOptions.forEach(o => {
                o.querySelector('div').classList.remove('border-2', 'border-slate-900', 'bg-slate-300');
                o.querySelector('div').classList.add('border', 'border-slate-100');
                o.querySelector('p').classList.replace('text-slate-900', 'text-slate-400');
            });
            // Set active class
            opt.querySelector('div').classList.remove('border', 'border-slate-100');
            opt.querySelector('div').classList.add('border-2', 'border-slate-900', 'bg-slate-300');
            opt.querySelector('p').classList.replace('text-slate-400', 'text-slate-900');
            
            // Apply simple CSS filter as a mock for Phase 2
            const filterType = opt.querySelector('p').innerText.trim().toLowerCase();
            
            if (processedImage) {
                const editorOverlay = document.getElementById('editor-loading-overlay');
                if (editorOverlay) editorOverlay.classList.remove('opacity-0', 'pointer-events-none');
                
                // Simulate processing time
                setTimeout(() => {
                    if (filterType === 'grayscale') {
                        processedImage.style.filter = 'grayscale(100%)';
                    } else if (filterType === 'blur') {
                        processedImage.style.filter = 'blur(4px)';
                    } else if (filterType === 'sepia') {
                        processedImage.style.filter = 'sepia(100%)';
                    } else {
                        processedImage.style.filter = 'none';
                    }
                    
                    if (editorOverlay) editorOverlay.classList.add('opacity-0', 'pointer-events-none');
                    if (window.showToast) window.showToast(`Applied ${filterType} filter`);
                }, 400); // 400ms loading effect
            }
        });
    });

    // Event listeners cho các tính năng khác sẽ được bổ sung ở Phase 2 & 3
});
