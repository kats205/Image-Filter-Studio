document.addEventListener('DOMContentLoaded', async () => {
    // -------------------------------------------------------------
    // STATE MANAGEMENT (History Stack)
    // -------------------------------------------------------------
    window.appState = {
        originalImageId: null,
        historyStack: [], // Array of { url, action, blob, filterState }
        currentIndex: -1,
        filterState: {}, // { filterName: intensityValue } — persisted across tab switches
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
        renderHistoryPanel();
    };

    // sourceRegion = { x, y, w, h } vị trí trong Image A (historyStack[0]) pixel space
    const pushToHistory = (blob, actionName, sourceRegion = null) => {
        if (window.appState.currentIndex < window.appState.historyStack.length - 1) {
            window.appState.historyStack = window.appState.historyStack.slice(0, window.appState.currentIndex + 1);
        }
        const url = URL.createObjectURL(blob);
        const filterSnapshot = { ...window.appState.filterState };
        // Kế thừa sourceRegion từ parent nếu không được cung cấp (filter không đổi vùng)
        const parentSR = sourceRegion !== null
            ? sourceRegion
            : (window.appState.historyStack[window.appState.currentIndex]?.sourceRegion ?? null);
        window.appState.historyStack.push({ url, action: actionName, blob, filterSnapshot, sourceRegion: parentSR });
        window.appState.currentIndex++;
        updateViewer();
    };

    /** Apply a filterState snapshot — restores filterState and updates slider to match */
    function applyFilterStateSnapshot(snapshot) {
        // Merge snapshot into live filterState
        window.appState.filterState = snapshot ? { ...snapshot } : {};
        // Update the active slider to match the snapshot value (or default/0 if absent)
        if (activeFilterName && intensitySlider) {
            const key = activeFilterName.toLowerCase();
            const restoredValue = window.appState.filterState[key];
            const config = window.filterConfigs?.find(f => f.name.toLowerCase() === key);
            // If the snapshot doesn't have this filter, reset to default (e.g. 0)
            const displayVal = restoredValue !== undefined
                ? restoredValue
                : (config ? config.defaultIntensity : 0);
            intensitySlider.value = displayVal;
            if (intensityVal) intensityVal.innerText = displayVal;
        }
    }

    // -------------------------------------------------------------
    // VISUAL HISTORY PANEL
    // -------------------------------------------------------------
    /** Tạo thumbnail 60x60 từ blob bằng Canvas và trả về data URL */
    async function makeThumbnailUrl(blob) {
        return new Promise((resolve) => {
            const img = new Image();
            const src = URL.createObjectURL(blob);
            img.onload = () => {
                URL.revokeObjectURL(src);
                const SIZE = 60;
                const canvas = document.createElement('canvas');
                canvas.width  = SIZE;
                canvas.height = SIZE;
                const ctx = canvas.getContext('2d');
                // Cover-fit: crop center
                const ratio = Math.max(SIZE / img.naturalWidth, SIZE / img.naturalHeight);
                const sw = SIZE / ratio;
                const sh = SIZE / ratio;
                const sx = (img.naturalWidth  - sw) / 2;
                const sy = (img.naturalHeight - sh) / 2;
                ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE);
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = () => { URL.revokeObjectURL(src); resolve(''); };
            img.src = src;
        });
    }

    /** Render toàn bộ lịch sử thành danh sách card có thumbnail */
    async function renderHistoryPanel() {
        const list   = document.getElementById('history-list');
        const empty  = document.getElementById('history-empty-state');
        if (!list) return;

        const stack  = window.appState.historyStack;
        const active = window.appState.currentIndex;

        if (stack.length === 0) {
            list.innerHTML = '';
            if (empty) empty.classList.remove('hidden');
            return;
        }
        if (empty) empty.classList.add('hidden');

        // Chỉ cập nhật lại toàn bộ khi số lượng thẻ không khớp (tránh flicker)
        if (list.children.length !== stack.length) {
            list.innerHTML = '';
            // Render newest-first (giống Photoshop)
            for (let i = stack.length - 1; i >= 0; i--) {
                const item      = stack[i];
                const isCurrent = i === active;
                const stepNum   = i + 1;

                const thumbUrl = await makeThumbnailUrl(item.blob);

                const card = document.createElement('div');
                card.dataset.stepIndex = i;
                card.style.cursor = 'pointer';
                card.className = [
                    'flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200',
                    isCurrent
                        ? 'bg-slate-900 border-slate-800 shadow-lg'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 opacity-80 hover:opacity-100',
                ].join(' ');

                card.innerHTML = `
                    <div class="w-[52px] h-[52px] rounded-xl overflow-hidden shrink-0 border ${isCurrent ? 'border-slate-700' : 'border-slate-200'} bg-slate-200">
                        ${thumbUrl ? `<img src="${thumbUrl}" class="w-full h-full object-cover" loading="lazy">` : `<div class="w-full h-full flex items-center justify-center text-slate-400 text-[9px]">No img</div>`}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-[11px] font-bold leading-snug truncate ${isCurrent ? 'text-white' : 'text-slate-900'}">
                            ${item.action || 'Step'}
                        </p>
                        <p class="text-[10px] mt-0.5 ${isCurrent ? 'text-slate-400' : 'text-slate-400'}">Step ${stepNum}</p>
                    </div>
                    ${isCurrent ? '<span class="bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Now</span>' : ''}
                `;

                card.addEventListener('click', () => {
                    const idx = parseInt(card.dataset.stepIndex);
                    // Non-destructive navigation: chỉ thay đổi currentIndex
                    window.appState.currentIndex = idx;
                    processedImage.src = window.appState.historyStack[idx].url;
                    // Restore filterState from this step's snapshot
                    applyFilterStateSnapshot(window.appState.historyStack[idx].filterSnapshot);
                    // Re-render panel to update active highlight
                    renderHistoryPanel();
                    if (window.showToast) window.showToast(`Nhảy về Step ${idx + 1}`, 'info');
                });

                list.appendChild(card);
            }
        } else {
            // Chỉ cập nhật lại highlight nếu số thẻ không đổi
            Array.from(list.children).forEach((card) => {
                const idx       = parseInt(card.dataset.stepIndex);
                const isCurrent = idx === active;
                card.className = [
                    'flex items-center gap-3 p-3 rounded-2xl border transition-all duration-200',
                    isCurrent
                        ? 'bg-slate-900 border-slate-800 shadow-lg cursor-default'
                        : 'bg-slate-50 border-slate-100 hover:bg-slate-100 opacity-80 hover:opacity-100 cursor-pointer',
                ].join(' ');
                // Update text colors
                const actionText = card.querySelector('p');
                if (actionText) actionText.className = `text-[11px] font-bold leading-snug truncate ${isCurrent ? 'text-white' : 'text-slate-900'}`;
                // Update Now badge
                const existingBadge = card.querySelector('span');
                if (isCurrent && !existingBadge) {
                    const badge = document.createElement('span');
                    badge.className = 'bg-emerald-500/20 text-emerald-400 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-tighter shrink-0';
                    badge.textContent = 'Now';
                    card.appendChild(badge);
                } else if (!isCurrent && existingBadge) {
                    existingBadge.remove();
                }
            });
        }
    }

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

            // Push original state (sourceRegion set after image loads via onload)
            window.appState.historyStack = [];
            window.appState.currentIndex = -1;
            pushToHistory(file, 'Original Upload', { x: 0, y: 0, w: 0, h: 0 });
            originImage.src = URL.createObjectURL(file);

            // Cập nhật dims thực cho historyStack[0].sourceRegion khi ảnh load xong
            const setOrigDims = () => {
                if (window.appState.historyStack[0]?.sourceRegion?.w === 0) {
                    window.appState.historyStack[0].sourceRegion = {
                        x: 0, y: 0,
                        w: processedImage.naturalWidth,
                        h: processedImage.naturalHeight,
                    };
                }
                processedImage.removeEventListener('load', setOrigDims);
            };
            processedImage.addEventListener('load', setOrigDims);

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

            // Cập nhật cấu hình slider, ưu tiên giá trị đã lưu trong filterState
            const config = window.filterConfigs.find(f => f.name.toLowerCase() === activeFilterName.toLowerCase());
            if (config && intensitySlider) {
                intensitySlider.min = config.minIntensity;
                intensitySlider.max = config.maxIntensity;
                // Đọc giá trị đã lưu; nếu chưa có thì dùng default
                const persistedVal = window.appState.filterState[activeFilterName.toLowerCase()];
                const displayVal = persistedVal !== undefined ? persistedVal : config.defaultIntensity;
                intensitySlider.value = displayVal;
                if (intensityVal) intensityVal.innerText = displayVal;
            }
        });
    });

    if (intensitySlider && intensityVal) {
        // ─── Real-time Preview (kéo slider) ──────────────────────────────
        // Dùng ảnh thumbnail 480px gửi lên server → phản hồi gần real-time
        intensitySlider.addEventListener('input', (e) => {
            const value = e.target.value;
            intensityVal.innerText = value;

            if (!activeFilterName || !window.appState.originalImageId || sessionBaseIndex < 0) return;

            // Khóa kích thước hiển thị để tránh ảnh bị co lại khi dùng preview nhỏ
            const imgEl = processedImage;
            if (!imgEl._lockedW && imgEl.naturalWidth > 0) {
                imgEl._lockedW = imgEl.offsetWidth;
                imgEl._lockedH = imgEl.offsetHeight;
                imgEl.style.width  = imgEl._lockedW + 'px';
                imgEl.style.height = imgEl._lockedH + 'px';
                imgEl.style.objectFit = 'cover';
            }

            clearTimeout(previewTimeout);
            previewTimeout = setTimeout(async () => {
                try {
                    const baseBlob = window.appState.historyStack[sessionBaseIndex].blob;
                    // Thu nhỏ xuống 480px trước khi gửi → payload nhỏ, server xử lý nhanh
                    const thumbBlob = await createPreviewBlob(baseBlob, 480, 0.55);
                    // preview=true prevents DB logging
                    const previewBlob = await applyFilter(window.appState.originalImageId, activeFilterName, value, thumbBlob, true);
                    // Cập nhật preview — kích thước hiển thị được khóa nên không bị thu nhỏ
                    imgEl.src = URL.createObjectURL(previewBlob);
                } catch (err) {
                    console.error('Preview error', err);
                }
            }, 30); // 30ms debounce — đủ để tránh flood, đủ gần real-time
        });

        // ─── Commit state khi nhả chuột (change) ────────────────────────
        // Dùng ảnh gốc full chất lượng để ghi vào history
        intensitySlider.addEventListener('change', async (e) => {
            const value = e.target.value;
            if (!activeFilterName || !window.appState.originalImageId || sessionBaseIndex < 0) return;

            // Mở khóa kích thước ảnh — updateViewer sẽ cập nhật đúng sau khi lưu history
            const imgEl = processedImage;
            if (imgEl._lockedW) {
                imgEl.style.width  = '';
                imgEl.style.height = '';
                imgEl.style.objectFit = '';
                delete imgEl._lockedW;
                delete imgEl._lockedH;
            }

            try {
                // Ảnh gốc chất lượng cao của phiên
                const currentBlob = window.appState.historyStack[sessionBaseIndex].blob;
                // preview=false commits to DB
                const finalBlob = await applyFilter(window.appState.originalImageId, activeFilterName, value, currentBlob, false);

                const newActionName = `${activeFilterName} (${value}%)`;

                // Lưu giá trị mới vào filterState
                window.appState.filterState[activeFilterName.toLowerCase()] = Number(value);

                // Nếu người dùng đang sửa đi sửa lại CÙNG MỘT filter, ghi đè frame lịch sử thay vì tạo mớ rác chồng chất
                if (window.appState.currentIndex > sessionBaseIndex) {
                    const url = URL.createObjectURL(finalBlob);
                    const filterSnapshot = { ...window.appState.filterState };
                    window.appState.historyStack[window.appState.currentIndex] = { url, action: newActionName, blob: finalBlob, filterSnapshot };
                    updateViewer();
                } else {
                    pushToHistory(finalBlob, newActionName);
                }

                if (window.showToast) window.showToast(`${activeFilterName} Applied`, 'success');
            } catch (err) {
                console.error('Commit error', err);
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

    const cropPresetBtns = document.querySelectorAll('#tab-content-transform section:last-of-type button[data-preset]');
    cropPresetBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            cropPresetBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const presetKey = btn.getAttribute('data-preset') || 'freeform';
            window.currentCropPreset = presetKey;

            // Kích hoạt chế độ crop kiểu CapCut (Fixed Frame)
            if (window.activateCropMode && window.appState.originalImageId) {
                window.activateCropMode(presetKey);
                if (window.showToast) window.showToast(`Crop frame: ${btn.innerText.trim()} — kéo ảnh để căn chỉnh`, 'info');
            } else if (!window.appState.originalImageId) {
                if (window.showToast) window.showToast('Hãy upload ảnh trước', 'error');
            }
        });
    });

    // Apply Crop button
    const btnApplyCrop = document.getElementById('btn-apply-crop');
    if (btnApplyCrop) {
        btnApplyCrop.addEventListener('click', async () => {
            if (!window.cropRegion || !window.appState.originalImageId) {
                if (window.showToast) window.showToast('Chọn tỉ lệ crop trước', 'info');
                return;
            }
            if (window.appState.currentIndex < 0) return;

            const cr = window.cropRegion;
            const cropSt = window.cropState || {};

            let sourceBlob, naturalW, naturalH;
            if (cropSt.isComposite && cropSt.origNaturalW) {
                // Re-crop: cropRegion đã tính trong Image A space (do composite getImgBounds = Image A)
                sourceBlob = window.appState.historyStack[0]?.blob;
                naturalW   = cropSt.origNaturalW;
                naturalH   = cropSt.origNaturalH;
            } else {
                // Simple crop (lần đầu): dùng ảnh hiện tại, coords là local space
                sourceBlob = window.appState.historyStack[window.appState.currentIndex]?.blob;
                naturalW   = processedImage.naturalWidth;
                naturalH   = processedImage.naturalHeight;
            }

            if (!sourceBlob || !naturalW || !naturalH) {
                if (window.showToast) window.showToast('Ảnh chưa sẵn sàng, thử lại', 'error');
                return;
            }

            const x = Math.round(Math.max(0, cr.nx * naturalW));
            const y = Math.round(Math.max(0, cr.ny * naturalH));
            const w = Math.round(Math.min(cr.nw * naturalW, naturalW - x));
            const h = Math.round(Math.min(cr.nh * naturalH, naturalH - y));

            if (w <= 0 || h <= 0) {
                if (window.showToast) window.showToast('Vùng crop không hợp lệ', 'error');
                return;
            }

            if (window.showToast) window.showToast('Đang xử lý crop...', 'info');
            try {
                const blob = await cropImage(
                    window.appState.originalImageId,
                    x, y, w, h,
                    sourceBlob,
                    false
                );
                // Lưu sourceRegion tuyệt đối trong Image A pixel space
                pushToHistory(blob, `Crop (${w}×${h})`, { x, y, w, h });
                if (window.showToast) window.showToast('Crop hoàn tất!', 'success');
            } catch (e) {
                console.error('Crop error', e);
                if (window.showToast) window.showToast('Crop thất bại', 'error');
            } finally {
                window.cropState = null;
                if (window.deactivateCropMode) window.deactivateCropMode();
            }
        });
    }

    // Cancel Crop button
    const btnCancelCrop = document.getElementById('btn-cancel-crop');
    if (btnCancelCrop) {
        btnCancelCrop.addEventListener('click', () => {
            if (window.deactivateCropMode) window.deactivateCropMode();
            if (processedImage) processedImage.style.transform = '';
            if (window.showToast) window.showToast('Crop đã hủy', 'info');
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
        btnProcessDownload.addEventListener('click', async () => {
            if (window.appState.currentIndex < 0) return;
            if (window.showToast) window.showToast('Preparing export...', 'info');

            const sourceBlob = window.appState.historyStack[window.appState.currentIndex].blob;
            const activeFormatBtn = document.querySelector('.export-format-btn.border-slate-900');
            const activeQualityBtn = document.querySelector('.export-quality-btn.border-slate-900');

            const ext        = activeFormatBtn ? activeFormatBtn.innerText.trim().toLowerCase() : 'jpg';
            const isPreview  = activeQualityBtn ? activeQualityBtn.innerText.includes('Preview') : false;

            try {
                let finalBlob;
                if (isPreview) {
                    // Preview: giảm JPEG quality xuống 65%, giữ nguyên kích thước pixel
                    finalBlob = await compressBlob(sourceBlob, 1, 0.65);
                    if (window.showToast) window.showToast('Exporting preview quality...', 'info');
                } else {
                    // Max Size: giữ blob gốc không thay đổi
                    finalBlob = sourceBlob;
                }

                const blobUrl = URL.createObjectURL(finalBlob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `Studio-${isPreview ? 'Preview' : 'Export'}-${Date.now()}.${ext}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                // Giải phóng URL sau 5s
                setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);

                closeDownloadModal();
                if (window.showToast) window.showToast('Download complete!', 'success');
            } catch (err) {
                console.error('Download error', err);
                if (window.showToast) window.showToast('Export failed', 'error');
            }
        });
    }
});
