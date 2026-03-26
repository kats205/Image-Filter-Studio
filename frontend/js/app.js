document.addEventListener('DOMContentLoaded', async () => {
    // -------------------------------------------------------------
    // STATE MANAGEMENT (History Stack)
    // -------------------------------------------------------------
    window.appState = {
        originalImageId: null,
        historyStack: [], // Array of { url: string, action: string, blob: Blob }
        currentIndex: -1
    };

    window.filterConfigs = [];
    try {
        window.filterConfigs = await getFilterList();
    } catch (e) {
        console.error("Could not fetch filter configs", e);
    }

    const originImage = document.getElementById('origin-image');
    const processedImage = document.getElementById('processed-image');

    const updateViewer = () => {
        if (window.appState.currentIndex >= 0) {
            const currentItem = window.appState.historyStack[window.appState.currentIndex];
            processedImage.src = currentItem.url;
        }
    };

    const pushToHistory = (blob, actionName) => {
        // If we are not at the end of the stack, truncate the future (Redo is lost upon new action)
        if (window.appState.currentIndex < window.appState.historyStack.length - 1) {
            window.appState.historyStack = window.appState.historyStack.slice(0, window.appState.currentIndex + 1);
        }
        
        const url = URL.createObjectURL(blob);
        window.appState.historyStack.push({ url, action: actionName, blob });
        window.appState.currentIndex++;
        updateViewer();
    };

    // -------------------------------------------------------------
    // REHYDRATION (F5 Recovery)
    // -------------------------------------------------------------
    const rehydrateTimeline = async () => {
        const savedImageId = localStorage.getItem('currentImageId');
        if (!savedImageId) return;

        try {
            if (window.showToast) window.showToast("Recovering past session...", "info");
            
            // 1. Fetch History Array
            let historyData = [];
            try { historyData = await getHistory(savedImageId); } 
            catch { /* Not failing completely just because history fetch errors */ }

            // 2. Fetch Original Image
            const originalBlob = await downloadImage(savedImageId);
            window.appState.originalImageId = savedImageId;
            originImage.src = URL.createObjectURL(originalBlob);
            pushToHistory(originalBlob, 'Original Upload');
            
            // Show workspace early so user isn't stuck
            const file = new File([originalBlob], "recovered.png", { type: originalBlob.type });
            if (window.onImageLoadedHook) {
                // Ép buộc chuyển ngay sang trang Editor (bỏ qua mọi hoạt ảnh hay hiệu ứng phụ thuộc vòng đời click)
                const landing = document.getElementById('landing-view');
                const editor = document.getElementById('editor-view');
                if (landing) landing.classList.add('hidden', 'view-hidden');
                if (editor) editor.classList.remove('hidden', 'view-hidden');
                
                // We bypass the upload by manually triggering UI setup
                document.getElementById('empty-state-dropzone').classList.add('hidden');
                document.getElementById('image-viewer-container').classList.remove('hidden');
                document.getElementById('sidebar-lock').classList.add('hidden');
                document.getElementById('sidebar-content').classList.remove('opacity-30', 'pointer-events-none');
                document.getElementById('thumb-icon').classList.add('hidden');
                document.getElementById('thumb-preview').classList.remove('hidden');
                document.getElementById('thumb-preview').src = originImage.src;
                document.getElementById('compare-toggle-container').classList.remove('hidden');
            }

            // 3. Silently reconstruct timeline
            for (const action of historyData) {
                const currentBlob = window.appState.historyStack[window.appState.currentIndex].blob;
                let newBlob;
                
                if (['Transform', 'Flip', 'Crop'].includes(action.actionName)) {
                    if (action.actionName === 'Transform') {
                        newBlob = await transformImage(savedImageId, action.parameters, currentBlob, true);
                        pushToHistory(newBlob, `Transform ${action.parameters}`);
                    } else if (action.actionName === 'Flip') {
                        newBlob = await flipImage(savedImageId, action.parameters, currentBlob, true);
                        pushToHistory(newBlob, `Flip ${action.parameters}`);
                    } else if (action.actionName === 'Crop') {
                        const p = JSON.parse(action.parameters);
                        newBlob = await cropImage(savedImageId, p.x, p.y, p.width, p.height, currentBlob, true);
                        pushToHistory(newBlob, `Crop`);
                    }
                } else {
                    newBlob = await applyFilter(savedImageId, action.actionName, action.intensity, currentBlob, true);
                    pushToHistory(newBlob, `${action.actionName} (${action.intensity})`);
                }
            }
            if (window.showToast) window.showToast("Session recovered successfully", "success");
        } catch (e) {
            console.error("Rehydration failed:", e);
            localStorage.removeItem('currentImageId');
        }
    };
    
    // -------------------------------------------------------------
    // 1. Hook into UI image load (Upload)
    // -------------------------------------------------------------
    window.onImageLoadedHook = async (file) => {
        if (window.resetWorkspace) window.resetWorkspace();
        
        try {
            // Check if we are rehydrating, if so don't re-upload
            if (window.appState.originalImageId && localStorage.getItem('currentImageId') === window.appState.originalImageId && file.name === "recovered.png") {
                return;
            }

            if (window.showToast) window.showToast("Uploading image...", "info");
            const data = await uploadImage(file);
            window.appState.originalImageId = data.imageId;
            localStorage.setItem('currentImageId', data.imageId);
            
            // Push original state
            window.appState.historyStack = [];
            window.appState.currentIndex = -1;
            pushToHistory(file, 'Original Upload');
            originImage.src = URL.createObjectURL(file);
            
            if (window.showToast) window.showToast("Ready for editing", "success");
        } catch (error) {
            console.error(error);
            if (window.showToast) window.showToast("Upload failed", "error");
        }
    };
    
    // Call on load
    await rehydrateTimeline();

    // -------------------------------------------------------------
    // EFFECTS TAB LOGIC (Filters & Intensity Debounce)
    // -------------------------------------------------------------
    const filterOptions = document.querySelectorAll('.filter-option');
    const intensitySlider = document.getElementById('intensity-slider');
    const intensityVal = document.getElementById('intensity-val');
    
    let activeFilterName = null;
    let previewTimeout = null;
    let sessionBaseIndex = -1; // Locks the base image state for a filter session

    filterOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            activeFilterName = opt.querySelector('p').innerText;
            // Áp dụng khóa gốc: Lấy mốc thời gian hiện tại làm gốc cho toàn bộ quá trình kéo slider
            sessionBaseIndex = window.appState.currentIndex;

            // UI Refresh Active State
            filterOptions.forEach(o => {
                const innerDiv = o.querySelector('div');
                const pLabel = o.querySelector('p');
                innerDiv.classList.remove('border-2', 'border-slate-900', 'bg-slate-50', 'text-slate-900');
                innerDiv.classList.add('border', 'border-slate-100', 'bg-white', 'text-slate-400');
                pLabel.classList.remove('text-slate-900');
                pLabel.classList.add('text-slate-400');
            });
            const innerDiv = opt.querySelector('div');
            const pLabel = opt.querySelector('p');
            innerDiv.classList.remove('border', 'border-slate-100', 'bg-white', 'text-slate-400');
            innerDiv.classList.add('border-2', 'border-slate-900', 'bg-slate-50', 'text-slate-900');
            pLabel.classList.remove('text-slate-400');
            pLabel.classList.add('text-slate-900');

            if (window.showToast) window.showToast(`Selected ${activeFilterName}`, 'success');
            
            // Cập nhật cấu hình slider dựa trên backend database mà KHÔNG tự động apply chồng bộ lọc
            const config = window.filterConfigs.find(f => f.name.toLowerCase() === activeFilterName.toLowerCase());
            if (config && intensitySlider) {
                intensitySlider.min = config.minIntensity;
                intensitySlider.max = config.maxIntensity;
                intensitySlider.value = config.defaultIntensity;
                if (intensityVal) intensityVal.innerText = config.defaultIntensity;
            }
        });
    });

    if (intensitySlider && intensityVal) {
        // Real-time Preview 
        intensitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            intensityVal.innerText = value;

            if (!activeFilterName || !window.appState.originalImageId || sessionBaseIndex < 0) return;
            
            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(async () => {
                try {
                    // Luôn lấy ảnh GỐC của phiên làm việc này, không lấy ảnh rác do các lần kéo trước tạo ra
                    const currentBlob = window.appState.historyStack[sessionBaseIndex].blob;
                    // preview=true prevents DB logging
                    const previewBlob = await applyFilter(window.appState.originalImageId, activeFilterName, value, currentBlob, true);
                    processedImage.src = URL.createObjectURL(previewBlob);
                } catch (err) {
                    console.error("Preview error", err);
                }
            }, 100); // 100ms debounce
        });

        // Finalize state on mouse release
        intensitySlider.addEventListener('change', async (e) => {
            const value = e.target.value;
            if (!activeFilterName || !window.appState.originalImageId || sessionBaseIndex < 0) return;

            try {
                // Vẫn dùng ảnh gốc của phiên
                const currentBlob = window.appState.historyStack[sessionBaseIndex].blob;
                // preview=false commits to DB
                const finalBlob = await applyFilter(window.appState.originalImageId, activeFilterName, value, currentBlob, false);
                
                const newActionName = `${activeFilterName} (${value}%)`;

                // Nếu người dùng đang sửa đi sửa lại CÙNG MỘT filter, ghi đè frame lịch sử thay vì tạo mớ rác chồng chất
                if (window.appState.currentIndex > sessionBaseIndex) {
                    const url = URL.createObjectURL(finalBlob);
                    window.appState.historyStack[window.appState.currentIndex] = { url, action: newActionName, blob: finalBlob };
                    updateViewer();
                } else {
                    pushToHistory(finalBlob, newActionName);
                }

                if (window.showToast) window.showToast(`${activeFilterName} Applied`, 'success');
            } catch (err) {
                console.error("Commit error", err);
                updateViewer(); // revert to last valid state
            }
        });
    }

    // -------------------------------------------------------------
    // TRANSFORM & FLIP LOGIC
    // -------------------------------------------------------------
    const orientButtons = document.querySelectorAll('#tab-content-transform section:first-of-type button');
    orientButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!window.appState.originalImageId) return;
            const action = btn.getAttribute('title').toLowerCase();
            const currentBlob = window.appState.historyStack[window.appState.currentIndex].blob;
            
            try {
                let newBlob;
                if (action.includes('flip')) {
                    const direction = action.includes('horizontal') ? 'horizontal' : 'vertical';
                    newBlob = await flipImage(window.appState.originalImageId, direction, currentBlob, false);
                } else {
                    let rotation = '90';
                    if (action.includes('180')) rotation = '180';
                    else if (action.includes('270') || action.includes('left')) rotation = '270';
                    
                    newBlob = await transformImage(window.appState.originalImageId, rotation, currentBlob, false);
                }
                pushToHistory(newBlob, `Transform ${action}`);
                if (window.showToast) window.showToast(`Applied ${action}`, 'success');
            } catch (err) {
                console.error("Transform error", err);
            }
        });
    });

    const cropPresetBtns = document.querySelectorAll('#tab-content-transform section:last-of-type button');
    cropPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cropPresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const map = { 'Freeform': 'freeform', 'Square 1:1': '1:1', 'Classic 4:3': '4:3', 'Wide 16:9': '16:9' };
            window.currentCropPreset = map[btn.innerText.trim()] ?? 'freeform';
            if (window.showToast) window.showToast(`Crop: ${btn.innerText.trim()} locked`, 'success');
        });
    });

    const btnApply = document.getElementById('btn-apply');
    if (btnApply) {
        btnApply.addEventListener('click', async () => {
            if (window.cropRegion && window.appState.originalImageId) {
                if (window.showToast) window.showToast("Applying crop...", "info");
                try { 
                    const currentBlob = window.appState.historyStack[window.appState.currentIndex].blob;
                    // Note: Coordinates from UI are relative to display.
                    // Assuming they scale roughly or BE crop accepts percentages?
                    // Actually, BE CropRequest asks for ints. The UI script calculated integers based on physical image dimensions!
                    // Let's pass them as is.
                    const blob = await cropImage(
                        window.appState.originalImageId, 
                        window.cropRegion.x, 
                        window.cropRegion.y, 
                        window.cropRegion.w, 
                        window.cropRegion.h,
                        currentBlob,
                        false
                    );
                    pushToHistory(blob, "Crop Applied");
                    if (window.showToast) window.showToast("Crop completed", "success");
                } catch(e) {
                    console.error("Crop error", e);
                }
                document.getElementById('crop-overlay')?.replaceChildren();
                window.cropRegion = null;
            } else {
                if (window.showToast) window.showToast("Nothing to apply", "info");
            }
        });
    }

    // -------------------------------------------------------------
    // UNDO / REDO LOGIC
    // -------------------------------------------------------------
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (e.ctrlKey && e.key.toLowerCase() === 'z') { e.preventDefault(); btnUndo?.click(); }
        if (e.ctrlKey && e.key.toLowerCase() === 'y') { e.preventDefault(); btnRedo?.click(); }
    });

    if (btnUndo) {
        btnUndo.addEventListener('click', () => {
            if (window.appState.currentIndex > 0) {
                window.appState.currentIndex--;
                updateViewer();
                if (window.showToast) window.showToast("Undo", "info");
            }
        });
    }

    if (btnRedo) {
        btnRedo.addEventListener('click', () => {
            if (window.appState.currentIndex < window.appState.historyStack.length - 1) {
                window.appState.currentIndex++;
                updateViewer();
                if (window.showToast) window.showToast("Redo", "info");
            }
        });
    }

    // -------------------------------------------------------------
    // DOWNLOAD LOGIC
    // -------------------------------------------------------------
    const btnDownload = document.getElementById('btn-download');
    const downloadModal = document.getElementById('download-modal');
    const downloadCard = document.getElementById('download-card');
    const btnCloseDownload = document.getElementById('btn-close-download');
    const btnProcessDownload = document.getElementById('btn-process-download');

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

    if (btnDownload) btnDownload.addEventListener('click', openDownloadModal);
    if (btnCloseDownload) btnCloseDownload.addEventListener('click', closeDownloadModal);
    if (downloadModal) downloadModal.addEventListener('click', (e) => { if (e.target === downloadModal) closeDownloadModal(); });

    const formatBtns = document.querySelectorAll('.export-format-btn');
    const qualityBtns = document.querySelectorAll('.export-quality-btn');
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

    if (btnProcessDownload) {
        btnProcessDownload.addEventListener('click', () => {
            if (window.appState.currentIndex < 0) return;
            if (window.showToast) window.showToast("Preparing export...", "info");
            
            setTimeout(() => {
                const blobUrl = window.appState.historyStack[window.appState.currentIndex].url;
                const activeFormatBtn = document.querySelector('.export-format-btn.border-slate-900');
                const ext = activeFormatBtn ? activeFormatBtn.innerText.trim().toLowerCase() : 'png';
                
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `Studio-Export-${Date.now()}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                closeDownloadModal();
                if (window.showToast) window.showToast("Image stored locally", "success");
            }, 600);
        });
    }
});
