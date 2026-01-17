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

    createBookItem(book) {
        const item = document.createElement('div');
        item.className = 'book-item';
        item.dataset.id = book.id;
        item.dataset.status = book.status;

        const title = book.title || '無題';
        const genre = book.tags && book.tags[0] ? book.tags[0] : null;
        const genreColor = genre ? DataManager.getGenreColor(genre) : 'var(--genre-default)';
        const progress = DataManager.getProgress(book);

        const coverHtml = book.coverUrl
            ? `<img src="${book.coverUrl}" alt="${title}" loading="lazy">`
            : `<div class="cover-placeholder" style="background: linear-gradient(135deg, ${genreColor}22, ${genreColor}44)">
                    <span class="cover-text" style="color: ${genreColor}; text-shadow: none;">${title.substring(0, 4)}</span>
               </div>`;

        // Status indicator (Simplified)
        let statusBadge = '';
        if (book.status === 'finished') {
            statusBadge = `<div class="status-badge finished">完読</div>`;
        } else if (book.status === 'reading') {
            statusBadge = `<div class="status-badge reading">読書中</div>`;
        } else if (book.ownership === 'owned') {
            // Only show owned if not handled above
            statusBadge = `<div class="status-badge owned">所持</div>`;
        }

        // Tags generation
        const tagsHtml = (book.tags || []).slice(0, 3).map(tag =>
            `<span class="mini-tag clickable" data-search="${tag}">#${tag}</span>`
        ).join('');

        // Progress bar for list view (in Info section)
        const progressHtml = (book.status === 'reading' && progress > 0) ?
            `<div class="reading-progress-container">
                <div class="reading-progress-bar-list">
                    <div class="progress-fill" style="width: ${progress}%"></div>
                </div>
                <span class="progress-percentage">${progress}%</span>
            </div>` : '';

        item.innerHTML = `
            <div class="book-cover-wrapper">
                ${coverHtml}
                ${statusBadge}
            </div>
            <div class="book-info">
                <div class="book-title">${title}</div>
                <div class="book-meta">
                    <span class="book-author clickable" data-search="${book.author || ''}">${book.author || '著者不明'}</span>
                </div>
                ${progressHtml}
                <div class="book-tags-list">
                    ${tagsHtml}
                </div>
            </div>
        `;

        item.addEventListener('click', (e) => {
            const clickable = e.target.closest('.clickable');
            if (clickable) {
                e.stopPropagation();
                const term = clickable.dataset.search;
                // Expose App or use event dispatch
                if (window.App && window.App.search) {
                    window.App.search(term);
                } else {
                    console.warn('Search function not available');
                }
            } else {
                App.openDetail(book.id);
            }
        });

        return item;
    },

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
