document.addEventListener('DOMContentLoaded', async () => {
    // 1. Hook into UI image load
    window.onImageLoadedHook = async (file) => {
        // Reset Workspace UI (Zoom/Pan/Selection)
        if (window.resetWorkspace) window.resetWorkspace();
        
        try {
            // // Phase 1: Gọi API upload file lên Backend (Comment temporaily if backend not up)
            // const data = await uploadImage(file);
            // localStorage.setItem('currentImageId', data.imageId);
        } catch (error) {
            console.error(error);
        }
    };

    // -------------------------------------------------------------
    // EFFECTS TAB LOGIC
    // -------------------------------------------------------------
    const filterOptions = document.querySelectorAll('.filter-option');
    const intensitySlider = document.getElementById('intensity-slider');
    const intensityVal = document.getElementById('intensity-val');

    // 1. Filter Selection
    filterOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            const filterType = opt.getAttribute('data-filter');
            const filterName = opt.querySelector('p').innerText;

            // UI Refresh: Remove active state from all
            filterOptions.forEach(o => {
                const innerDiv = o.querySelector('div');
                const pLabel = o.querySelector('p');
                innerDiv.classList.remove('border-2', 'border-slate-900', 'bg-slate-50', 'text-slate-900');
                innerDiv.classList.add('border', 'border-slate-100', 'bg-white', 'text-slate-400');
                pLabel.classList.remove('text-slate-900');
                pLabel.classList.add('text-slate-400');
            });

            // UI Refresh: Set active state to selected
            const innerDiv = opt.querySelector('div');
            const pLabel = opt.querySelector('p');
            innerDiv.classList.remove('border', 'border-slate-100', 'bg-white', 'text-slate-400');
            innerDiv.classList.add('border-2', 'border-slate-900', 'bg-slate-50', 'text-slate-900');
            pLabel.classList.remove('text-slate-400');
            pLabel.classList.add('text-slate-900');

            // Feedback
            if (window.showToast) {
                window.showToast(`Selected ${filterName} filter`, 'success');
            }
        });
    });

    // 2. Intensity Slider
    if (intensitySlider && intensityVal) {
        intensitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            intensityVal.innerText = value;
        });

        intensitySlider.addEventListener('change', (e) => {
            const value = e.target.value;
            if (window.showToast) {
                window.showToast(`Intensity set to ${value}%`, 'info');
            }
        });
    }

    // 1. Orientation/Flip Buttons
    const orientButtons = document.querySelectorAll('#tab-content-transform section:first-of-type button');
    orientButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.getAttribute('title');
            if (window.showToast) window.showToast(`Action: ${action}`, 'info');
        });
    });

    // 2. Crop Presets Logic
    const cropPresetBtns = document.querySelectorAll('#tab-content-transform section:last-of-type button');
    cropPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // UI Toggle
            cropPresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Set Global State
            const map = { 
                'Freeform': 'freeform', 
                'Square 1:1': '1:1', 
                'Classic 4:3': '4:3', 
                'Wide 16:9': '16:9' 
            };
            window.currentCropPreset = map[btn.innerText.trim()] ?? 'freeform';
            if (window.showToast) window.showToast(`Crop: ${btn.innerText.trim()} locked`, 'success');
        });
    });

    // -------------------------------------------------------------
    // HISTORY TAB LOGIC
    // -------------------------------------------------------------
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const exportButtons = document.querySelectorAll('#tab-content-history .flex.gap-2 button');

    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            if (window.showToast) window.showToast("Undo last action", "info");
        });
    }

    if (btnRedo) {
        btnRedo.addEventListener('click', () => {
             // Redo is often disabled initially, but we add the listener for consistency
             if (!btnRedo.classList.contains('cursor-not-allowed')) {
                if (window.showToast) window.showToast("Redo action", "info");
             }
        });
    }

    // -------------------------------------------------------------
    // DOWNLOAD MODAL LOGIC
    // -------------------------------------------------------------
    const btnDownload = document.getElementById('btn-download');
    const downloadModal = document.getElementById('download-modal');
    const downloadCard = document.getElementById('download-card');
    const btnCloseDownload = document.getElementById('btn-close-download');
    const btnProcessDownload = document.getElementById('btn-process-download');
    
    const formatBtns = document.querySelectorAll('.export-format-btn');
    const qualityBtns = document.querySelectorAll('.export-quality-btn');

    const openDownloadModal = () => {
        downloadModal.classList.remove('opacity-0', 'pointer-events-none');
        downloadCard.classList.remove('translate-y-12', 'scale-90', 'opacity-0');
        downloadCard.classList.add('translate-y-0', 'scale-100', 'opacity-100');
    };

    const closeDownloadModal = () => {
        downloadModal.classList.add('opacity-0', 'pointer-events-none');
        downloadCard.classList.add('translate-y-12', 'scale-90', 'opacity-0');
        downloadCard.classList.remove('translate-y-0', 'scale-100', 'opacity-100');
    };

    if (btnDownload) {
        btnDownload.addEventListener('click', openDownloadModal);
    }

    if (btnCloseDownload) btnCloseDownload.addEventListener('click', closeDownloadModal);
    
    if (downloadModal) {
        downloadModal.addEventListener('click', (e) => {
            if (e.target === downloadModal) closeDownloadModal();
        });
    }

    // Toggle logic for format/quality
    const setupToggle = (buttons) => {
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => {
                    b.classList.remove('border-2', 'border-slate-900', 'bg-slate-50', 'text-slate-900', 'shadow-lg');
                    b.classList.add('border-2', 'border-slate-200', 'bg-white', 'text-slate-500');
                });
                btn.classList.remove('border-2', 'border-slate-200', 'bg-white', 'text-slate-500');
                btn.classList.add('border-2', 'border-slate-900', 'bg-slate-50', 'text-slate-900', 'shadow-lg');
            });
        });
    };

    setupToggle(formatBtns);
    setupToggle(qualityBtns);

    // -------------------------------------------------------------
    // GLOBAL APPLY BUTTON (Phase 2 & 4)
    // -------------------------------------------------------------
    const btnApply = document.getElementById('btn-apply');
    if (btnApply) {
        btnApply.addEventListener('click', async () => {
            // 1. CROP CASE
            if (window.cropRegion) {
                if (window.showToast) window.showToast("Applying crop...", "success");
                
                // Stub for Phase 4: 
                // try { 
                //   const blob = await cropImage(localStorage.getItem('currentImageId'), 
                //      window.cropRegion.x, window.cropRegion.y, window.cropRegion.w, window.cropRegion.h);
                //   processedImage.src = URL.createObjectURL(blob);
                // } catch(e) {...}
                
                // Visual cleanup
                document.getElementById('crop-overlay')?.replaceChildren();
                window.cropRegion = null;
                return;
            }

            // 2. FILTER CASE (Tạm thời toast)
            if (window.showToast) window.showToast("Applying adjustments...", "success");
        });
    }

    if (btnProcessDownload) {
        btnProcessDownload.addEventListener('click', () => {
            if (window.showToast) window.showToast("Preparing high-fidelity export...", "success");
            setTimeout(() => {
                closeDownloadModal();
                if (window.showToast) window.showToast("Image downloaded successfully", "success");
            }, 1200);
        });
    }
});
