/**
 * Bookshelf - UI Module (Grid Layout)
 */

const UI = {
    elements: {},

    init() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            bookshelfGrid: document.getElementById('bookshelfGrid'),
            bookshelfContainer: document.getElementById('bookshelfContainer'),
            emptyState: document.getElementById('emptyState'),
            genreFilters: document.getElementById('genreFilters'), // Updated ID
            searchInput: document.getElementById('searchInput'),
            btnClearSearch: document.getElementById('btnClearSearch'),
            statusFilters: document.getElementById('statusFilters'), // Updated ID
            toast: document.getElementById('toast')
        };
    },

    bindEvents() {
        this.elements.searchInput.addEventListener('input', () => App.handleSearch());
        this.elements.btnClearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            App.handleSearch();
        });
    },

    renderBooks(books) {
        // ... (省略可能だが、replace範囲に含まれるためそのまま記述するか、範囲を狭める)
        // renderBooksは修正不要なので範囲外にする手もあるが、cacheElementsとの間にあるbindEventsを挟むので一括で
        const grid = this.elements.bookshelfGrid;
        grid.innerHTML = '';
        if (books.length === 0) {
            this.elements.emptyState.classList.add('visible');
            this.elements.bookshelfGrid.style.display = 'none';
        } else {
            this.elements.emptyState.classList.remove('visible');
            this.elements.bookshelfGrid.style.display = 'grid'; // Grid or flex depending on layout
        }

        books.forEach(book => {
            const bookItem = this.createBookItem(book);
            grid.appendChild(bookItem);
        });
    },

    // ... createBookItem omit ...

    renderGenreTabs(genres) {
        const container = this.elements.genreFilters;
        if (!container) return;

        // Keep "All" button
        container.innerHTML = '<button class="filter-chip genre-chip active" data-genre="all">すべて</button>';

        genres.forEach(genre => {
            const btn = document.createElement('button');
            btn.className = 'filter-chip genre-chip';
            btn.textContent = genre;
            btn.dataset.genre = genre;
            // Removed inline style color for simpler chip design, or keep it
            // btn.style.setProperty('--tag-color', DataManager.getGenreColor(genre));
            btn.addEventListener('click', () => App.filterByGenre(genre));
            container.appendChild(btn);
        });
    },

    setActiveStatusTab(status) {
        // status is array or string 'all'
        const current = Array.isArray(status) ? status : [status];
        const buttons = this.elements.statusFilters.querySelectorAll('.status-chip');

        buttons.forEach(btn => {
            const val = btn.dataset.status;
            if (val === 'all') {
                btn.classList.toggle('active', current.includes('all'));
            } else {
                btn.classList.toggle('active', current.includes(val));
            }
        });
    },

    setActiveGenreTab(genre) {
        const bg = genre || 'all';
        const buttons = this.elements.genreFilters.querySelectorAll('.genre-chip');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.genre === bg);
        });
    },

    showToast(message, duration = 2500) {
        const toast = this.elements.toast;
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), duration);
    }
};

window.UI = UI;
