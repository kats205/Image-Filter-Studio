document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 2. Setup AutoAnimate for dynamic UI changes (Not for page transitions)
    const workspaceContent = document.getElementById('workspace-content');
    if (workspaceContent && window.autoAnimate) {
        window.autoAnimate(workspaceContent, { duration: 300 });
    }

    // -------------------------------------------------------------
    // NOTIVUE-STANDARD STACKED TOAST (Pure Fade & Layering)
    // -------------------------------------------------------------
    window.showToast = function(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        // Siêu nhỏ gọn, padding ít đi
        toast.className = 'toast-item px-3 py-2 bg-slate-900 text-white shadow-2xl rounded-full flex items-center justify-center gap-2 border border-white/10';
        toast.setAttribute('data-state', 'visible');
        
        toast.innerHTML = `
            <i data-lucide="${type === 'success' ? 'check' : 'info'}" class="w-3.5 h-3.5 ${type === 'success' ? 'text-emerald-400' : 'text-blue-400'}"></i>
            <span class="font-inter text-[11px] font-bold tracking-tight whitespace-nowrap">${message}</span>
        `;
        
        container.prepend(toast);
        if (window.lucide) window.lucide.createIcons();
        
        // Force Reflow for fade-in trigger
        void toast.offsetWidth;
        
        const updateStack = () => {
            const items = container.querySelectorAll('.toast-item');
            items.forEach((item, index) => {
                item.setAttribute('data-index', index);
            });
        };

        updateStack();

        const fadeOutAndRemove = () => {
            toast.setAttribute('data-state', 'hidden');
            setTimeout(() => {
                toast.remove();
                updateStack();
            }, 600); // Wait for CSS opacity duration
        };

        toast.onclick = fadeOutAndRemove;
        setTimeout(fadeOutAndRemove, 4500);
    };

    // 3. Elements mapping
    const el = {
        landingView: document.getElementById('landing-view'),
        editorView: document.getElementById('editor-view'),
        navEditorLink: document.getElementById('nav-editor-link'),
        btnBackGallery: document.getElementById('btn-back-gallery'),
        
        fileUploads: [
            document.getElementById('hero-upload'),
            document.getElementById('file-upload')
        ],
        
        emptyStateDropzone: document.getElementById('empty-state-dropzone'),
        imageViewerContainer: document.getElementById('image-viewer-container'),
        originPane: document.getElementById('origin-pane'),
        processedPane: document.getElementById('processed-pane'),
        
        originImage: document.getElementById('origin-image'),
        processedImage: document.getElementById('processed-image'),
        
        sidebarLock: document.getElementById('sidebar-lock'),
        sidebarContent: document.getElementById('sidebar-content'),
        thumbPreview: document.getElementById('thumb-preview'),
        thumbIcon: document.getElementById('thumb-icon'),
        
        compareToggleContainer: document.getElementById('compare-toggle-container'),
        btnToggleCompare: document.getElementById('btn-toggle-compare'),
        compareIcon: document.getElementById('compare-icon'),
        compareIconActive: document.getElementById('compare-icon-active'),
        compareText: document.getElementById('compare-text'),
        
        floatingToolbarButtons: document.querySelectorAll('#floating-toolbar button'),
        syncIcon: document.getElementById('sync-icon')
    };

    // -------------------------------------------------------------
    // NAVIGATION LOGIC (PAGE TRANSITIONS)
    // -------------------------------------------------------------
    function showEditor() {
        // Fade out landing
        el.landingView.classList.add('view-hidden');
        
        // Wait for landing to start fading, then swap
        setTimeout(() => {
            el.landingView.classList.add('hidden');
            el.editorView.classList.remove('hidden');
            
            // Trigger entrance animation
            requestAnimationFrame(() => {
                el.editorView.classList.remove('view-hidden');
                if (window.lucide) window.lucide.createIcons();
            });
        }, 400); // 400ms is a sweet spot for switching
    }

    function showGallery() {
        // Fade out editor
        el.editorView.classList.add('view-hidden');
        
        setTimeout(() => {
            el.editorView.classList.add('hidden');
            el.landingView.classList.remove('hidden');
            
            requestAnimationFrame(() => {
                el.landingView.classList.remove('view-hidden');
            });
        }, 400);
    }

    if (el.navEditorLink) {
        el.navEditorLink.addEventListener('click', (e) => {
            e.preventDefault();
            showEditor();
        });
    }

    if (el.btnBackGallery) {
        el.btnBackGallery.addEventListener('click', () => {
            showGallery();
        });
    }

    // -------------------------------------------------------------
    // UPLOAD IMAGE LOGIC
    // -------------------------------------------------------------
    const handleImageLoad = (file) => {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target.result;
            
            // Show the editor immediately so user sees the central spinner
            showEditor();
            
            const editorOverlay = document.getElementById('editor-loading-overlay');
            if (editorOverlay) editorOverlay.classList.remove('opacity-0', 'pointer-events-none');
            
            // Simulate processing time
            setTimeout(() => {
                if (editorOverlay) editorOverlay.classList.add('opacity-0', 'pointer-events-none');
                if (window.showToast) window.showToast("Project workspace ready");

                // set images
                el.originImage.src = result;
                el.processedImage.src = result;
                el.thumbPreview.src = result;
                
                // Setup Editor state = IMAGE PREVIEW STATE
                // hide empty dropzone
                el.emptyStateDropzone.classList.add('hidden');
                
                // show image viewer
                el.imageViewerContainer.classList.remove('hidden');
                
                // Unlock sidebar
                el.sidebarLock.classList.add('hidden'); // fade out conceptually
                el.sidebarContent.classList.remove('opacity-30', 'pointer-events-none');
                
                // Show thumbnail
                el.thumbIcon.classList.add('hidden');
                el.thumbPreview.classList.remove('hidden');
                
                // Show toggle compare button
                el.compareToggleContainer.classList.remove('hidden');
                
                // Default to "Inactive Comparison" (only processed pane shows)
                // Processed pane gets full flex-1
                el.originPane.classList.add('hidden', 'opacity-0', '-translate-x-8');
                
                // Expose globally to let App.js hook in
                if (window.onImageLoadedHook) {
                    window.onImageLoadedHook(file);
                }
            }, 600); // 600ms artificial delay for aesthetic loader
        };
        reader.readAsDataURL(file);
    };

    el.fileUploads.forEach(input => {
        if (input) {
            input.addEventListener('change', (e) => {
                handleImageLoad(e.target.files[0]);
            });
        }
    });

    // -------------------------------------------------------------
    // COMPARE TOGGLE LOGIC (Dual Pane)
    // -------------------------------------------------------------
    let isComparing = false;
    
    if (el.btnToggleCompare) {
        el.btnToggleCompare.addEventListener('click', () => {
            isComparing = !isComparing;
            const iconShow = document.getElementById('compare-icon-show');
            const iconHide = document.getElementById('compare-icon-hide');
            const processedBadge = document.getElementById('processed-badge');
            
            if (isComparing) {
                // Show Dual Pane
                el.originPane.classList.remove('hidden');
                if (processedBadge) {
                    processedBadge.classList.remove('hidden');
                    setTimeout(() => processedBadge.classList.add('opacity-100'), 20);
                }
                
                // slight delay for transition effect
                setTimeout(() => {
                    el.originPane.classList.remove('opacity-0', '-translate-x-8');
                }, 10);
                
                // update button style
                el.btnToggleCompare.classList.remove('bg-white', 'hover:bg-slate-50', 'text-slate-900', 'border-slate-100');
                el.btnToggleCompare.classList.add('bg-slate-900', 'hover:bg-black', 'text-white', 'border-slate-800');
                el.compareText.classList.replace('text-slate-900', 'text-white');
                el.compareText.innerText = 'Hide Origin';
                
                if (iconShow) iconShow.classList.add('hidden');
                if (iconHide) iconHide.classList.remove('hidden');
                
                if (el.syncIcon) el.syncIcon.classList.remove('hidden');
            } else {
                // Hide Dual Pane
                el.originPane.classList.add('opacity-0', '-translate-x-8');
                if (processedBadge) {
                    processedBadge.classList.remove('opacity-100');
                    setTimeout(() => processedBadge.classList.add('hidden'), 500);
                }
                
                setTimeout(() => {
                    el.originPane.classList.add('hidden');
                }, 300); // Wait for transition
                
                // update button style
                el.btnToggleCompare.classList.remove('bg-slate-900', 'hover:bg-black', 'text-white', 'border-slate-800');
                el.btnToggleCompare.classList.add('bg-white', 'hover:bg-slate-50', 'text-slate-900', 'border-slate-100');
                el.compareText.classList.replace('text-white', 'text-slate-900');
                el.compareText.innerText = 'Show Origin';
                
                if (iconShow) iconShow.classList.remove('hidden');
                if (iconHide) iconHide.classList.add('hidden');
                
                if (el.syncIcon) el.syncIcon.classList.add('hidden');
            }
        });
    }

    // Assign globally
    window.uiState = el;

    // -------------------------------------------------------------
    // MOTION ONE ANIMATIONS (MINIMALISM) & PERFORMANCE
    // -------------------------------------------------------------
    if (window.Motion) {
        const { animate, stagger, inView } = window.Motion;
        
        // 1. Hero Entrance Animation
        animate(".hero-title", 
            { opacity: [0, 1], y: [20, 0] }, 
            { duration: 0.8, easing: "ease-out" }
        );
        
        animate(".hero-upload-card", 
            { opacity: [0, 1], y: [20, 0] }, 
            { duration: 0.8, delay: 0.15, easing: "ease-out" }
        );

        // 2. Feature Grid Staggering on Scroll
        inView(".feature-item", (element) => {
            animate(element, 
                { opacity: [0, 1], y: [20, 0] }, 
                { duration: 0.6, easing: "ease-out" }
            );
        });
    }

    // -------------------------------------------------------------
    // LANDING SLIDER (THE STUDIO DIFFERENCE) INTERACTIVITY
    // -------------------------------------------------------------
    const sliderContainer = document.getElementById('landing-slider-container');
    const sliderClip = document.getElementById('landing-slider-clip');
    const sliderHandle = document.getElementById('landing-slider-handle');
    const sliderBadge = document.getElementById('landing-slider-processed-badge');
    const sliderImg = document.getElementById('landing-slider-processed-img');

    if (sliderContainer && sliderClip && sliderHandle) {
        let isDragging = false;
        const originalBadge = document.getElementById('landing-slider-original-badge');

        const updateSlider = (clientX) => {
            const rect = sliderContainer.getBoundingClientRect();
            if (rect.width === 0) return;
            
            let x = clientX - rect.left;
            
            // Constrain
            if (x < 0) x = 0;
            if (x > rect.width) x = rect.width;
            
            const percentage = (x / rect.width) * 100;
            
            // Update Clip & Handle
            sliderClip.style.width = `${100 - percentage}%`;
            sliderClip.style.left = `${percentage}%`;
            sliderHandle.style.left = `${percentage}%`;
            
            // Keep the processed image aligned with the background original image
            if (sliderImg) {
                sliderImg.style.width = `${rect.width}px`;
                sliderImg.style.marginLeft = `-${x}px`;
            }
            
            // Badge visibility based on space
            if (originalBadge) {
                originalBadge.style.opacity = percentage < 15 ? '0' : '1';
                originalBadge.style.pointerEvents = percentage < 15 ? 'none' : 'auto';
            }
            if (sliderBadge) {
                sliderBadge.style.opacity = percentage > 85 ? '0' : '1';
                sliderBadge.style.pointerEvents = percentage > 85 ? 'none' : 'auto';
            }
        };

        const startDragging = (e) => {
            isDragging = true;
            document.body.classList.add('select-none');
            sliderContainer.classList.add('cursor-grabbing');
        };

        const stopDragging = (e) => {
            isDragging = false;
            document.body.classList.remove('select-none');
            sliderContainer.classList.remove('cursor-grabbing');
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
            updateSlider(clientX);
        };

        // Event Listeners
        sliderHandle.addEventListener('mousedown', startDragging);
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('mousemove', handleMove);

        sliderHandle.addEventListener('touchstart', startDragging);
        window.addEventListener('touchend', stopDragging);
        window.addEventListener('touchmove', handleMove, { passive: false });

        // Initialize at 50% on load and resize
        const initSlider = () => {
            const rect = sliderContainer.getBoundingClientRect();
            if (rect.width > 0) {
                updateSlider(rect.left + rect.width / 2);
            }
        };
        
        // Initial setup
        setTimeout(initSlider, 300);
        window.addEventListener('resize', initSlider);
    }

    // -------------------------------------------------------------
    // TAB SWITCHING LOGIC (Sidebar)
    // -------------------------------------------------------------
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    if (tabBtns.length > 0) {
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                
                // Update Button Visuals
                tabBtns.forEach(b => {
                    b.classList.remove('bg-slate-50', 'text-slate-900', 'border-b-2', 'border-slate-900');
                    b.classList.add('text-slate-400');
                });
                btn.classList.add('bg-slate-50', 'text-slate-900', 'border-b-2', 'border-slate-900');
                btn.classList.remove('text-slate-400');

                // Toggle Tab Panes
                tabPanes.forEach(p => p.classList.add('hidden'));
                const activePane = document.getElementById(`tab-content-${targetTab}`);
                if (activePane) activePane.classList.remove('hidden');
                
                // Optional: Show toast for feedback
                // if (window.showToast) window.showToast(`Switched to ${targetTab} tools`, 'info');
                
                // Refresh Lucide Icons for any newly shown content
                if (window.lucide) window.lucide.createIcons();
            });
        });
    }

    // -------------------------------------------------------------
    // SIDEBAR TOGGLE LOGIC
    // -------------------------------------------------------------
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebarPanel = document.getElementById('sidebar-panel');
    const sidebarToggleIcon = document.getElementById('sidebar-toggle-icon');
    let isSidebarCollapsed = false;

    if (btnToggleSidebar && sidebarPanel) {
        btnToggleSidebar.addEventListener('click', () => {
            isSidebarCollapsed = !isSidebarCollapsed;
            
            if (isSidebarCollapsed) {
                // Collapse (Hide Sidebar to the Right)
                sidebarPanel.classList.remove('w-80');
                sidebarPanel.classList.add('w-0', 'border-l-0', 'opacity-0');
                if (sidebarToggleIcon) {
                    sidebarToggleIcon.style.transform = 'rotate(180deg)';
                }
                btnToggleSidebar.classList.replace('right-4', 'right-6'); 
            } else {
                // Expand (Show Sidebar)
                sidebarPanel.classList.add('w-80');
                sidebarPanel.classList.remove('w-0', 'border-l-0', 'opacity-0');
                if (sidebarToggleIcon) {
                    sidebarToggleIcon.style.transform = 'rotate(0deg)';
                }
                btnToggleSidebar.classList.replace('right-6', 'right-4');
            }
        });
    }

    // -------------------------------------------------------------
    // WORKSPACE INTERACTION LOGIC (ZOOM, PAN, TOOL SELECTION)
    // -------------------------------------------------------------
    const btnZoomIn = document.getElementById('btn-zoom-in');
    const btnZoomOut = document.getElementById('btn-zoom-out');
    const btnFitScreen = document.getElementById('btn-fit-screen');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const btnHandTool = document.getElementById('btn-hand-tool');
    const btnSelectTool = document.getElementById('btn-select-tool');
    const zoomLevelText = document.getElementById('zoom-level-text');
    const viewerContainer = document.getElementById('image-viewer-container');
    
    let currentZoom = 1.0;
    let currentTool = 'select'; // 'select' or 'pan'

    // NEW state variables for Workspace Interactivity
    let panOffset = { x: 0, y: 0 };
    let isPanning = false;
    let panStart = { x: 0, y: 0 };

    // Selection/Crop state (managed by CapCut Fixed Frame system below)
    window.currentCropPreset = null; // Share with app.js

    function applyTransform() {
        if (!el.imageViewerContainer) return;
        
        // Correct for scale: divide translation by zoom factor
        const tx = panOffset.x / currentZoom;
        const ty = panOffset.y / currentZoom;
        
        el.imageViewerContainer.style.transform = `scale(${currentZoom}) translate(${tx}px, ${ty}px)`;
        el.imageViewerContainer.style.transformOrigin = 'center center';
        
        // Use smooth transition unless dragging
        el.imageViewerContainer.style.transition = isPanning ? 'none' : 'transform 0.3s cubic-bezier(0.2, 1, 0.3, 1)';
        
        if (zoomLevelText) {
            zoomLevelText.innerText = `${Math.round(currentZoom * 100)}%`;
        }
    }

    function setTool(tool) {
        currentTool = tool;
        
        // Update Buttons UI
        if (tool === 'select') {
            btnSelectTool.classList.add('bg-slate-900', 'text-white');
            btnSelectTool.classList.remove('text-slate-500', 'hover:bg-slate-50');
            btnHandTool.classList.remove('bg-slate-900', 'text-white');
            btnHandTool.classList.add('text-slate-500', 'hover:bg-slate-50');
            if (viewerContainer) viewerContainer.style.cursor = 'default';
        } else {
            btnHandTool.classList.add('bg-slate-900', 'text-white');
            btnHandTool.classList.remove('text-slate-500', 'hover:bg-slate-50');
            btnSelectTool.classList.remove('bg-slate-900', 'text-white');
            btnSelectTool.classList.add('text-slate-500', 'hover:bg-slate-50');
            if (viewerContainer) viewerContainer.style.cursor = 'grab';
        }
        
        if (window.showToast) window.showToast(`${tool.charAt(0).toUpperCase() + tool.slice(1)} tool active`);
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        // Prevent shortcuts if user is typing in an input (not currently many, but good practice)
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (key === 'v') setTool('select');
        if (key === 'h') setTool('pan');
        if (key === '+') btnZoomIn.click();
        if (key === '-') btnZoomOut.click();
        if (key === '0') btnFitScreen.click();
    });

    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', () => {
            if (currentZoom < 3.0) {
                currentZoom += 0.2;
                applyTransform();
            }
        });
    }

    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            if (currentZoom > 0.25) {
                currentZoom -= 0.2;
                applyTransform();
            }
        });
    }

    if (btnFitScreen) {
        btnFitScreen.addEventListener('click', () => {
            currentZoom = 1.0;
            panOffset = { x: 0, y: 0 };
            applyTransform();
        });
    }

    if (btnFullscreen) {
        btnFullscreen.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(err => {
                    if (window.showToast) window.showToast("Error enabling fullscreen", "error");
                });
            } else {
                document.exitFullscreen();
            }
        });
    }

    if (btnSelectTool) {
        btnSelectTool.addEventListener('click', () => setTool('select'));
    }

    if (btnHandTool) {
        btnHandTool.addEventListener('click', () => setTool('pan'));
    }

    // Initial tool state & apply initial transform
    setTool('select');
    applyTransform();

    // -------------------------------------------------------------
    // PAN TOOL INTERACTION LOOP
    // -------------------------------------------------------------
    el.imageViewerContainer.addEventListener('mousedown', (e) => {
        if (currentTool !== 'pan' || e.button !== 0) return;
        e.preventDefault(); // Prevent standard image drag-and-drop
        isPanning = true;
        panStart = { 
            x: e.clientX - panOffset.x, 
            y: e.clientY - panOffset.y 
        };
        el.imageViewerContainer.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isPanning || currentTool !== 'pan') return;
        window.getSelection()?.removeAllRanges(); // Clear any accidental text selection
        panOffset = { 
            x: e.clientX - panStart.x, 
            y: e.clientY - panStart.y 
        };
        applyTransform();
    });

    window.addEventListener('mouseup', () => {
        if (!isPanning) return;
        isPanning = false;
        if (currentTool === 'pan') {
            el.imageViewerContainer.style.cursor = 'grab';
        }
    });

    // -------------------------------------------------------------
    // PROFESSIONAL CROP SYSTEM (Freeform Handles + Fixed Ratio)
    // -------------------------------------------------------------
    let cropFrameActive = false;
    let cropCurrentPreset = null;

    // Crop frame state (in display-px, relative to the rendered image's top-left)
    let cropBox = { x: 0, y: 0, w: 0, h: 0 };
    let cropInteraction = null;

    // ── Composite canvas state (for re-crop mode) ──
    let _compCanvas = null;        // the canvas element shown instead of processedImage
    let _compImgABounds = null;    // Image A bounds in pane-relative px { x, y, w, h }
    let _compImgBRegion = null;    // Image B region normalised to Image A { nx, ny, nw, nh }
    let _compActive    = false;

    const RATIO_MAP = {
        'freeform': null,
        '1:1':  { w: 1,  h: 1  },
        '4:3':  { w: 4,  h: 3  },
        '16:9': { w: 16, h: 9  },
    };

    // ── DOM elements created once ────────────────────────────────
    const cropContainer = document.createElement('div');
    cropContainer.id = 'crop-container';
    cropContainer.style.cssText = `
        position: absolute; inset: 0; z-index: 24; display: none; pointer-events: none;
    `;

    // Dark overlay (4 strips around the frame)
    const overlayParts = ['top','bottom','left','right'].map(side => {
        const d = document.createElement('div');
        d.dataset.overlayPart = side;
        d.style.cssText = 'position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;';
        cropContainer.appendChild(d);
        return d;
    });

    // The bright frame itself
    const cropFrame = document.createElement('div');
    cropFrame.id = 'capcut-crop-frame';
    cropFrame.style.cssText = `
        position: absolute;
        border: 2px solid #fff;
        box-sizing: border-box;
        pointer-events: auto;
        cursor: move;
    `;

    // Rule-of-thirds grid
    const grid = document.createElement('div');
    grid.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
    grid.innerHTML = `
        <div style="position:absolute;left:33.33%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.3);"></div>
        <div style="position:absolute;left:66.66%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.3);"></div>
        <div style="position:absolute;top:33.33%;left:0;right:0;height:1px;background:rgba(255,255,255,0.3);"></div>
        <div style="position:absolute;top:66.66%;left:0;right:0;height:1px;background:rgba(255,255,255,0.3);"></div>
    `;
    cropFrame.appendChild(grid);

    // 8 resize handles
    const HANDLES = [
        { id:'nw', cursor:'nw-resize', style:'top:-5px;left:-5px;'       },
        { id:'n',  cursor:'n-resize',  style:'top:-5px;left:50%;transform:translateX(-50%);' },
        { id:'ne', cursor:'ne-resize', style:'top:-5px;right:-5px;'      },
        { id:'e',  cursor:'e-resize',  style:'top:50%;right:-5px;transform:translateY(-50%);' },
        { id:'se', cursor:'se-resize', style:'bottom:-5px;right:-5px;'   },
        { id:'s',  cursor:'s-resize',  style:'bottom:-5px;left:50%;transform:translateX(-50%);' },
        { id:'sw', cursor:'sw-resize', style:'bottom:-5px;left:-5px;'    },
        { id:'w',  cursor:'w-resize',  style:'top:50%;left:-5px;transform:translateY(-50%);'  },
    ];

    HANDLES.forEach(h => {
        const el2 = document.createElement('div');
        el2.dataset.handle = h.id;
        el2.style.cssText = `
            position:absolute;width:10px;height:10px;
            background:#fff;border:1.5px solid rgba(0,0,0,0.4);
            border-radius:2px;cursor:${h.cursor};
            pointer-events:auto;${h.style}
        `;
        // Only show corner handles if freeform
        el2.classList.add('crop-handle');
        cropFrame.appendChild(el2);
    });

    cropContainer.appendChild(cropFrame);
    el.processedPane.style.position = 'relative';
    el.processedPane.appendChild(cropContainer);

    // ── Helper: load an image from URL ──
    function _loadImg(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
        });
    }

    // ── Helper: get the rendered image bounds (px relative to pane) ──
    function getImgBounds() {
        if (_compActive && _compImgABounds) return { ..._compImgABounds };
        const paneRect = el.processedPane.getBoundingClientRect();
        const imgRect  = el.processedImage.getBoundingClientRect();
        return {
            x: imgRect.left - paneRect.left,
            y: imgRect.top  - paneRect.top,
            w: imgRect.width,
            h: imgRect.height,
        };
    }

    // ── Apply cropBox to DOM ─────────────────────────────────────
    function renderCropFrame() {
        const ib = getImgBounds();

        // Frame position in pane coords
        const fx = ib.x + cropBox.x;
        const fy = ib.y + cropBox.y;
        const fw = cropBox.w;
        const fh = cropBox.h;

        cropFrame.style.left   = `${fx}px`;
        cropFrame.style.top    = `${fy}px`;
        cropFrame.style.width  = `${fw}px`;
        cropFrame.style.height = `${fh}px`;

        // Overlay strips (relative to pane)
        // top strip
        overlayParts[0].style.cssText = `position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;left:${ib.x}px;top:${ib.y}px;width:${ib.w}px;height:${cropBox.y}px;`;
        // bottom strip
        overlayParts[1].style.cssText = `position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;left:${ib.x}px;top:${fy + fh}px;width:${ib.w}px;height:${ib.h - cropBox.y - fh}px;`;
        // left strip
        overlayParts[2].style.cssText = `position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;left:${ib.x}px;top:${fy}px;width:${cropBox.x}px;height:${fh}px;`;
        // right strip
        overlayParts[3].style.cssText = `position:absolute;background:rgba(0,0,0,0.55);pointer-events:none;left:${fx + fw}px;top:${fy}px;width:${ib.w - cropBox.x - fw}px;height:${fh}px;`;

        // Expose normalized region
        window.cropRegion = {
            nx: cropBox.x / ib.w,
            ny: cropBox.y / ib.h,
            nw: cropBox.w / ib.w,
            nh: cropBox.h / ib.h,
            dispW: ib.w,
            dispH: ib.h,
        };

        // Show/hide handles based on preset
        const isHandle = cropCurrentPreset === 'freeform';
        cropFrame.querySelectorAll('.crop-handle').forEach(h2 => {
            h2.style.display = isHandle ? 'block' : 'none';
        });

        // For fixed-ratio, make move cursor visible
        cropFrame.style.cursor = cropCurrentPreset === 'freeform' ? 'move' : 'move';
    }

    // ── Constrain cropBox to image bounds ────────────────────────
    function clampCropBox(ratio) {
        const MIN = 20;
        if (cropBox.x < 0) cropBox.x = 0;
        if (cropBox.y < 0) cropBox.y = 0;
        if (cropBox.w < MIN) cropBox.w = MIN;
        if (cropBox.h < MIN) cropBox.h = MIN;

        const ib = getImgBounds();
        if (cropBox.x + cropBox.w > ib.w) cropBox.x = Math.max(0, ib.w - cropBox.w);
        if (cropBox.y + cropBox.h > ib.h) cropBox.y = Math.max(0, ib.h - cropBox.h);
        if (cropBox.w > ib.w) cropBox.w = ib.w;
        if (cropBox.h > ib.h) cropBox.h = ib.h;

        // Re-enforce ratio for fixed presets
        if (ratio) {
            const desiredW = cropBox.h * (ratio.w / ratio.h);
            if (desiredW <= ib.w) {
                cropBox.w = desiredW;
            } else {
                cropBox.w = ib.w;
                cropBox.h = ib.w * (ratio.h / ratio.w);
            }
            if (cropBox.x + cropBox.w > ib.w) cropBox.x = ib.w - cropBox.w;
            if (cropBox.y + cropBox.h > ib.h) cropBox.y = ib.h - cropBox.h;
        }
    }

    // ── Build initial cropBox for a given preset ────────────────────
    function initCropBox(presetKey) {
        const ratio = RATIO_MAP[presetKey];
        const ib = getImgBounds();
        if (!ib.w || !ib.h) return;

        // Re-crop freeform: initial box = Image B's region within Image A display space
        if (_compActive && _compImgBRegion && !ratio) {
            cropBox = {
                x: _compImgBRegion.nx * ib.w,
                y: _compImgBRegion.ny * ib.h,
                w: _compImgBRegion.nw * ib.w,
                h: _compImgBRegion.nh * ib.h,
            };
            clampCropBox(null);
            return;
        }

        if (!ratio) {
            cropBox = { x: 0, y: 0, w: ib.w, h: ib.h };
        } else {
            const maxW = ib.w * 0.92;
            const maxH = ib.h * 0.92;
            let fw, fh;
            if (maxW / ratio.w * ratio.h <= maxH) { fw = maxW; fh = maxW / ratio.w * ratio.h; }
            else { fh = maxH; fw = maxH / ratio.h * ratio.w; }
            cropBox = {
                x: (ib.w - fw) / 2,
                y: (ib.h - fh) / 2,
                w: fw,
                h: fh,
            };
        }
        clampCropBox(ratio);
    }

    // ── Build composite canvas for re-crop mode ────────────────────────
    async function _buildComposite(origEntry, currEntry, sourceRegion, origSR, presetKey) {
        const [imgA, imgB] = await Promise.all([
            _loadImg(origEntry.url),
            _loadImg(currEntry.url),
        ]);

        const paneRect = el.processedPane.getBoundingClientRect();
        const pW = paneRect.width;
        const pH = paneRect.height;

        // Scale Image A to fit pane (contain)
        const scaleA = Math.min(pW / imgA.naturalWidth, pH / imgA.naturalHeight);
        const dAW = Math.round(imgA.naturalWidth  * scaleA);
        const dAH = Math.round(imgA.naturalHeight * scaleA);
        const dAX = Math.round((pW - dAW) / 2);
        const dAY = Math.round((pH - dAH) / 2);

        // Image B pixel position within Image A display space
        const bLeft = dAX + Math.round(sourceRegion.x / origSR.w * dAW);
        const bTop  = dAY + Math.round(sourceRegion.y / origSR.h * dAH);
        const bW    = Math.round(sourceRegion.w / origSR.w * dAW);
        const bH    = Math.round(sourceRegion.h / origSR.h * dAH);

        // Create / reuse canvas
        if (!_compCanvas) {
            _compCanvas = document.createElement('canvas');
            _compCanvas.id = 'crop-composite-canvas';
            _compCanvas.style.cssText = 'position:absolute;top:0;left:0;pointer-events:none;z-index:2;';
            el.processedPane.querySelector('div').appendChild(_compCanvas);
        }
        _compCanvas.width  = pW;
        _compCanvas.height = pH;
        _compCanvas.style.width  = pW + 'px';
        _compCanvas.style.height = pH + 'px';
        _compCanvas.style.display = 'block';

        const ctx = _compCanvas.getContext('2d');
        ctx.clearRect(0, 0, pW, pH);
        // Draw Image A dimmed (context / vùng đã bị cắt)
        ctx.globalAlpha = 0.38;
        ctx.drawImage(imgA, dAX, dAY, dAW, dAH);
        // Draw Image B at correct position, full opacity
        ctx.globalAlpha = 1.0;
        ctx.drawImage(imgB, bLeft, bTop, bW, bH);

        // Store results
        _compImgABounds = { x: dAX, y: dAY, w: dAW, h: dAH };
        _compImgBRegion = {
            nx: sourceRegion.x / origSR.w,
            ny: sourceRegion.y / origSR.h,
            nw: sourceRegion.w / origSR.w,
            nh: sourceRegion.h / origSR.h,
        };
        _compActive = true;

        // Tell app.js crop handler to use Image A coords
        window.cropState = {
            isComposite: true,
            origNaturalW: imgA.naturalWidth,
            origNaturalH: imgA.naturalHeight,
        };

        // Hide processedImage — canvas is the visual reference
        el.processedImage.style.opacity = '0';

        requestAnimationFrame(() => {
            initCropBox(presetKey);
            cropContainer.style.display = 'block';
            renderCropFrame();
            document.getElementById('crop-action-buttons')?.classList.remove('hidden');
        });
    }

    // ── Activate / Deactivate ──────────────────────────────────
    function activateCropMode(presetKey) {
        cropCurrentPreset = presetKey;
        cropFrameActive   = true;
        window.cropState  = null;

        const currEntry = window.appState?.historyStack?.[window.appState.currentIndex];
        const origEntry = window.appState?.historyStack?.[0];
        const sourceRegion = currEntry?.sourceRegion;
        const origSR = origEntry?.sourceRegion;

        // Re-crop: current image is a crop subset of Image A (has valid sourceRegion)
        const isReCrop = origSR?.w > 0 && sourceRegion && (
            sourceRegion.x > 0 || sourceRegion.y > 0 ||
            sourceRegion.w < origSR.w || sourceRegion.h < origSR.h
        );

        // Remove old ghost (replaced by composite canvas)
        const oldGhost = document.getElementById('crop-ghost-img');
        if (oldGhost) oldGhost.style.display = 'none';

        if (isReCrop) {
            _buildComposite(origEntry, currEntry, sourceRegion, origSR, presetKey);
        } else {
            _compActive = false;
            el.processedImage.style.opacity = '';
            requestAnimationFrame(() => {
                initCropBox(presetKey);
                cropContainer.style.display = 'block';
                renderCropFrame();
                document.getElementById('crop-action-buttons')?.classList.remove('hidden');
            });
        }
    }

    function deactivateCropMode() {
        cropFrameActive = false;
        cropContainer.style.display = 'none';
        document.getElementById('crop-action-buttons')?.classList.add('hidden');
        window.cropRegion = null;
        cropInteraction   = null;

        // Clean up composite canvas
        if (_compCanvas) _compCanvas.style.display = 'none';
        _compActive    = false;
        _compImgABounds = null;
        _compImgBRegion = null;

        // Restore processedImage
        el.processedImage.style.opacity  = '';
        el.processedImage.style.position = '';
        el.processedImage.style.zIndex   = '';
    }

    window.activateCropMode  = activateCropMode;
    window.deactivateCropMode = deactivateCropMode;

    // ── Mouse interaction: MOVE the whole frame ──────────────────
    cropFrame.addEventListener('mousedown', (e) => {
        // Only move if NOT clicking on a resize handle
        if (e.target.dataset.handle) return;
        e.preventDefault();
        cropInteraction = {
            type: 'move',
            startX: e.clientX,
            startY: e.clientY,
            startBox: { ...cropBox },
        };
    });

    // ── Mouse interaction: RESIZE via handles ────────────────────
    cropFrame.querySelectorAll('.crop-handle').forEach(handleEl => {
        handleEl.addEventListener('mousedown', (e) => {
            if (cropCurrentPreset !== 'freeform') return; // handles only for freeform
            e.preventDefault();
            e.stopPropagation();
            cropInteraction = {
                type: 'resize',
                handle: handleEl.dataset.handle,
                startX: e.clientX,
                startY: e.clientY,
                startBox: { ...cropBox },
            };
        });
    });

    window.addEventListener('mousemove', (e) => {
        if (!cropInteraction) return;
        const dx = e.clientX - cropInteraction.startX;
        const dy = e.clientY - cropInteraction.startY;
        const ratio = RATIO_MAP[cropCurrentPreset];
        const sb = cropInteraction.startBox;
        const ib = getImgBounds();

        if (cropInteraction.type === 'move') {
            cropBox.x = sb.x + dx;
            cropBox.y = sb.y + dy;
            cropBox.w = sb.w;
            cropBox.h = sb.h;
        } else {
            // Resize
            const h = cropInteraction.handle;
            let { x, y, w, h: bh } = sb;

            if (h.includes('e')) { w  = Math.max(20, sb.w + dx); }
            if (h.includes('s')) { bh = Math.max(20, sb.h + dy); }
            if (h.includes('w')) { const nw = Math.max(20, sb.w - dx); x = sb.x + (sb.w - nw); w = nw; }
            if (h.includes('n')) { const nh = Math.max(20, sb.h - dy); y = sb.y + (sb.h - nh); bh = nh; }

            cropBox = { x, y, w, h: bh };
        }

        clampCropBox(ratio);
        renderCropFrame();
    });

    window.addEventListener('mouseup', () => {
        cropInteraction = null;
    });

    // ── Reset pan function exposed to window for app.js ──────────
    window.resetWorkspace = () => {
        panOffset = { x: 0, y: 0 };
        currentZoom = 1.0;
        applyTransform();
        deactivateCropMode();
        if (el.processedImage) el.processedImage.style.transform = '';
        // Reset all filter state
        if (window.appState) window.appState.filterState = {};
    };
});


