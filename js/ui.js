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
            bookCount: document.getElementById('bookCount'),
            genreTags: document.getElementById('genreTags'),
            searchInput: document.getElementById('searchInput'),
            btnClearSearch: document.getElementById('btnClearSearch'),
            statusTabs: document.getElementById('statusTabs'),
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
        const grid = this.elements.bookshelfGrid;
        grid.innerHTML = '';

        if (books.length === 0) {
            this.elements.emptyState.classList.add('visible');
            this.elements.bookCount.textContent = '0 冊';
            return;
        }

        this.elements.emptyState.classList.remove('visible');
        this.elements.bookCount.textContent = `${books.length} 冊`;

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

        const genre = book.tags && book.tags[0] ? book.tags[0] : null;
        const genreColor = genre ? DataManager.getGenreColor(genre) : 'var(--genre-default)';
        const progress = DataManager.getProgress(book);

        const coverHtml = book.coverUrl
            ? `<img src="${book.coverUrl}" alt="${book.title}" loading="lazy">`
            : `<div class="cover-placeholder" style="background: linear-gradient(135deg, ${genreColor}22, ${genreColor}44)">
                    <span class="cover-text" style="color: ${genreColor}; text-shadow: none;">${book.title.substring(0, 4)}</span>
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

        item.innerHTML = `
            <div class="book-cover-wrapper">
                ${coverHtml}
                ${statusBadge}
                ${book.status === 'reading' && progress > 0 ?
                `<div class="reading-progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>` : ''}
            </div>
            <div class="book-info">
                <div class="book-title">${book.title}</div>
                <div class="book-meta">
                    <span class="book-author">${book.author || '著者不明'}</span>
                </div>
            </div>
        `;

        item.addEventListener('click', () => App.openDetail(book.id));

        return item;
    },

    renderGenreTabs(genres) {
        const container = this.elements.genreTags;
        container.innerHTML = '';
        genres.forEach(genre => {
            const btn = document.createElement('button');
            btn.className = 'genre-tag';
            btn.textContent = genre;
            btn.dataset.genre = genre;
            btn.style.setProperty('--tag-color', DataManager.getGenreColor(genre));
            btn.addEventListener('click', () => App.filterByGenre(genre));
            container.appendChild(btn);
        });
    },

    setActiveStatusTab(status) {
        document.querySelectorAll('.status-tabs .tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.status === status);
        });
    },

    setActiveGenreTab(genre) {
        document.querySelectorAll('.genre-tag').forEach(tag => {
            tag.classList.toggle('active', tag.dataset.genre === genre);
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
