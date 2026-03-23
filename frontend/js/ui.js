const beforeImage = document.getElementById('beforeImage');
const afterImage = document.getElementById('afterImage');
const previewSection = document.getElementById('preview-section');
const controlsSection = document.getElementById('controls-section');
const filterList = document.getElementById('filterList');

function showPreview(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        beforeImage.src = e.target.result;
        previewSection.classList.remove('hidden');
    };
    reader.readAsDataURL(file);
}

function updateAfterImage(blob) {
    const url = URL.createObjectURL(blob);
    afterImage.src = url;
}

function renderFilters(filters) {
    filterList.innerHTML = ''; // Clear existing filters
    filters.forEach(filter => {
        const btn = document.createElement('button');
        btn.textContent = filter.label;
        btn.onclick = () => {
            // Logic call applyFilter from app.js
            console.log(`Apply filter: ${filter.name}`);
        };
        filterList.appendChild(btn);
    });
}

function showToast(message, type = 'error') {
    alert(`${type.toUpperCase()}: ${message}`);
}
