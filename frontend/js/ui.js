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
                
                // Enable toolbar
                el.floatingToolbarButtons.forEach(btn => {
                    btn.removeAttribute('disabled');
                });
                
                // Enable download button
                const btnDownload = document.getElementById('btn-download');
                if (btnDownload) btnDownload.removeAttribute('disabled');
                
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

    function updateZoomDisplay() {
        if (zoomLevelText) {
            zoomLevelText.innerText = `${Math.round(currentZoom * 100)}%`;
        }
        if (viewerContainer) {
            viewerContainer.style.transform = `scale(${currentZoom})`;
            viewerContainer.style.transition = 'transform 0.3s cubic-bezier(0.2, 1, 0.3, 1)';
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
                updateZoomDisplay();
            }
        });
    }

    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', () => {
            if (currentZoom > 0.25) {
                currentZoom -= 0.2;
                updateZoomDisplay();
            }
        });
    }

    if (btnFitScreen) {
        btnFitScreen.addEventListener('click', () => {
            currentZoom = 1.0;
            updateZoomDisplay();
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

    // Initial tool state
    setTool('select');
});
