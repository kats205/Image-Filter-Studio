document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Lucide Icons
    if (window.lucide) {
        lucide.createIcons();
    }

    // 2. Setup AutoAnimate for smooth DOM transitions
    const workspaceContent = document.getElementById('workspace-content');
    if (workspaceContent && window.autoAnimate) {
        window.autoAnimate(workspaceContent, { duration: 300 });
    }
    if (window.autoAnimate) {
        // Apply to body for SPA transitions between Landing and Editor
        window.autoAnimate(document.body, { duration: 400 });
        
        // Apply to toast container
        const toastContainer = document.getElementById('toast-container');
        if (toastContainer) {
            window.autoAnimate(toastContainer, { duration: 250 });
        }
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
    // NAVIGATION LOGIC
    // -------------------------------------------------------------
    function showEditor() {
        el.landingView.classList.add('hidden');
        el.editorView.classList.remove('hidden');
    }

    function showGallery() {
        el.editorView.classList.add('hidden');
        el.landingView.classList.remove('hidden');
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
            
            if (isComparing) {
                // Show Dual Pane
                el.originPane.classList.remove('hidden');
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
});
    // -------------------------------------------------------------
    // LANDING SLIDER (THE STUDIO DIFFERENCE)
