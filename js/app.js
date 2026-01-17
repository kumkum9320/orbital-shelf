/**
 * Orbital Shelf - Main App Module
 */

const App = {
    currentFilter: { status: 'all', genre: null, query: '', sort: 'updated_desc' },
    currentView: 'home',

    async init() {
        // Make App globally available for inline event handlers
        window.App = this;

        UI.init();
        this.bindEvents();
        this.registerServiceWorker();

        // Initial View
        this.switchView('library');

        // Wait for auth state
        const user = await AuthManager.init();

        if (user) {
            // User is logged in
            this.hideLoginOverlay();
            await this.initializeWithUser();
        } else {
            // Show login screen
            this.showLoginOverlay();
        }
    },

    async initializeWithUser() {
        // Migrate local data if exists
        await DataManager.migrateLocalToFirestore();
        // Load books from Firestore
        await DataManager.loadFromFirestore();
        this.loadBooks();
        this.updateUserInfo();
    },

    showLoginOverlay() {
        document.getElementById('loginOverlay').classList.add('visible');
    },

    hideLoginOverlay() {
        document.getElementById('loginOverlay').classList.remove('visible');
    },

    updateUserInfo() {
        const user = AuthManager.getUser();
        if (user) {
            // Could add user avatar/name to header if desired
            console.log('Logged in as:', user.displayName);
        }
    },

    async handleLogin() {
        try {
            await AuthManager.signInWithGoogle();
            this.hideLoginOverlay();
            await this.initializeWithUser();
            UI.showToast('ログインしました');
        } catch (error) {
            console.error('Login error:', error);
            UI.showToast('ログインに失敗しました');
        }
    },

    async handleLogout() {
        try {
            await AuthManager.signOut();
            DataManager.localCache = [];
            this.loadBooks();
            this.showLoginOverlay();
            this.switchView('home');
            UI.showToast('ログアウトしました');
        } catch (error) {
            console.error('Logout error:', error);
        }
    },

    bindEvents() {
        // Login button
        document.getElementById('btnGoogleLogin').addEventListener('click', () => this.handleLogin());

        // Personal View: Logout button
        const btnPersonalLogout = document.getElementById('btnPersonalLogout');
        if (btnPersonalLogout) {
            btnPersonalLogout.addEventListener('click', () => {
                if (confirm('ログアウトしますか？')) {
                    this.handleLogout();
                }
            });
        }

        // Footer Add button
        const btnAddFooter = document.getElementById('btnAddFooter');
        if (btnAddFooter) btnAddFooter.addEventListener('click', () => this.openAddModal());

        // Add button (Header - kept for compatibility if needed, though hidden)
        const btnAdd = document.getElementById('btnAdd');
        if (btnAdd) btnAdd.addEventListener('click', () => this.openAddModal());
        const btnAddFirst = document.getElementById('btnAddFirst');
        if (btnAddFirst) btnAddFirst.addEventListener('click', () => this.openAddModal());

        // Bottom Navigation
        document.querySelectorAll('.bottom-nav .nav-item[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.switchView(target);
            });
        });

        // Modal controls - Add
        document.getElementById('btnCloseAdd').addEventListener('click', () => this.closeModal('modalAdd'));
        document.getElementById('btnCancelAdd').addEventListener('click', () => this.closeModal('modalAdd'));
        document.querySelector('#modalAdd .modal-overlay').addEventListener('click', () => this.closeModal('modalAdd'));

        // Modal controls - Detail
        document.getElementById('btnCloseDetail').addEventListener('click', () => this.closeModal('modalDetail'));
        document.querySelector('#modalDetail .modal-overlay').addEventListener('click', () => this.closeModal('modalDetail'));

        // Modal controls - Log
        document.getElementById('btnCloseLog').addEventListener('click', () => this.closeModal('modalLog'));
        document.getElementById('btnCancelLog').addEventListener('click', () => this.closeModal('modalLog'));
        document.querySelector('#modalLog .modal-overlay').addEventListener('click', () => this.closeModal('modalLog'));

        // Status filters
        document.querySelectorAll('.filter-chip.status-chip').forEach(tab => {
            tab.addEventListener('click', () => this.filterByStatus(tab.dataset.status));
        });

        // Genre filters (Delegation for dynamic buttons)
        /* moved to inline onclick or handle via UI render */

        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentFilter.sort = e.target.value;
                this.loadBooks();
            });
        }

        // Book form
        document.getElementById('bookForm').addEventListener('submit', (e) => this.handleBookSubmit(e));

        // Book search (API)
        document.getElementById('btnSearchBook').addEventListener('click', () => this.searchBookAPI());
        document.getElementById('bookSearchQuery').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchBookAPI();
            }
        });

        // AI assist toggle
        document.getElementById('btnToggleAI').addEventListener('click', () => {
            document.querySelector('.ai-assist-section').classList.toggle('collapsed');
        });

        // AI assist
        document.getElementById('btnGeneratePrompt').addEventListener('click', () => this.generatePrompt());
        document.getElementById('btnImportJson').addEventListener('click', () => this.importJson());

        // Log form
        document.getElementById('logForm').addEventListener('submit', (e) => this.handleLogSubmit(e));

        // AI Tag Assist Modal
        const btnPersonalAITag = document.getElementById('btnPersonalAITag');
        if (btnPersonalAITag) btnPersonalAITag.addEventListener('click', () => this.openAITagModal());

        // Old button compatibility
        const btnAITag = document.getElementById('btnAITag');
        if (btnAITag) btnAITag.addEventListener('click', () => this.openAITagModal());

        document.getElementById('btnCloseAITag').addEventListener('click', () => this.closeModal('modalAITag'));
        document.querySelector('#modalAITag .modal-overlay').addEventListener('click', () => this.closeModal('modalAITag'));
        document.getElementById('btnApplyTags').addEventListener('click', () => this.applyAITags());
        document.getElementById('btnCopyTagPrompt').addEventListener('click', () => this.copyTagPrompt());

        // Delete Confirmation Modal
        document.getElementById('btnCancelDelete').addEventListener('click', () => this.closeModal('modalDeleteConfirm'));
        document.getElementById('btnConfirmDelete').addEventListener('click', () => this.confirmDelete());
        document.querySelector('#modalDeleteConfirm .modal-overlay').addEventListener('click', () => this.closeModal('modalDeleteConfirm'));
    },

    switchView(viewName) {
        console.log('Switching view to:', viewName);
        this.currentView = viewName;

        // DOM Elements
        const libraryHeader = document.getElementById('libraryHeader');
        const bookshelf = document.getElementById('bookshelfContainer');
        const personalView = document.getElementById('personalView');
        const navItems = document.querySelectorAll('.nav-item[data-target]');
        const bookCountTarget = document.getElementById('bookCount');

        // Helper to toggle visibility
        const toggle = (el, show) => {
            if (!el) return;
            if (show) {
                el.style.display = 'block';
                el.classList.add('active');
            } else {
                el.style.display = 'none';
                el.classList.remove('active');
            }
        };

        // Reset Nav Active State
        navItems.forEach(item => item.classList.remove('active'));

        // Toggle Views
        if (viewName === 'library' || viewName === 'home' || viewName === 'search') {
            toggle(libraryHeader, true);
            toggle(bookshelf, true);
            toggle(personalView, false);
            if (bookCountTarget) bookCountTarget.style.display = 'block';

            const activeNav = document.getElementById('navLibrary');
            if (activeNav) activeNav.classList.add('active');

        } else if (viewName === 'personal') {
            toggle(libraryHeader, false);
            toggle(bookshelf, false);
            toggle(personalView, true);
            if (bookCountTarget) bookCountTarget.style.display = 'none';
            this.updatePersonalStats();

            const activeNav = document.getElementById('navPersonal');
            if (activeNav) activeNav.classList.add('active');
        }
    },

    updatePersonalStats() {
        if (!typeof DataManager === 'undefined') return;
        const books = DataManager.getAllBooks();
        const totalEl = document.getElementById('statTotalBooks');
        const finishedEl = document.getElementById('statFinishedBooks');

        if (totalEl) totalEl.textContent = books.length;
        if (finishedEl) finishedEl.textContent = books.filter(b => b.status === 'finished').length;
    },

    loadBooks() {
        console.log('Loading books...');
        if (typeof DataManager === 'undefined') {
            console.error('DataManager not found');
            return;
        }
        let books = DataManager.filterBooks(this.currentFilter);

        // Sort books
        const sortType = this.currentFilter.sort || 'updated_desc';
        books.sort((a, b) => {
            let valA, valB;
            // Use updatedAt or createdAt or id (timestamp)
            const getTimestamp = (book) => {
                // If we had proper timestamps in Firestore, we'd use them.
                // For now, fallback to string comparison or id (which might be timestamp-based or random)
                // Assuming newer IDs or updatedAt strings are larger/later.
                return book.updatedAt || book.createdAt || book.id;
            };

            switch (sortType) {
                case 'created_asc':
                    valA = a.createdAt || a.id;
                    valB = b.createdAt || b.id;
                    return valA > valB ? 1 : -1;
                case 'created_desc':
                    valA = a.createdAt || a.id;
                    valB = b.createdAt || b.id;
                    return valA < valB ? 1 : -1;
                case 'updated_asc':
                    valA = getTimestamp(a);
                    valB = getTimestamp(b);
                    return valA > valB ? 1 : -1;
                case 'updated_desc':
                default:
                    valA = getTimestamp(a);
                    valB = getTimestamp(b);
                    return valA < valB ? 1 : -1;
            }
        });

        try {
            UI.renderBooks(books);
            const genres = DataManager.getAllGenres();
            UI.renderGenreTabs(genres);
        } catch (e) {
            console.error('Error rendering books:', e);
            UI.showToast(`描画エラー: ${e.message}`);
        }
    },

    handleSearch() {
        this.currentFilter.query = UI.elements.searchInput.value.trim();
        this.loadBooks();
    },

    searchByKeyword(keyword) {
        this.switchView('library');
        // Wait for view switch to ensure elements are visible/cached if needed
        setTimeout(() => {
            if (UI.elements.searchInput) {
                UI.elements.searchInput.value = keyword;
                this.handleSearch();
            }
        }, 10);
    },

    // Public search method called from UI clicks
    search(term) {
        this.searchByKeyword(term);
    },

    filterByStatus(status) {
        let current = this.currentFilter.status;
        // Ensure current is array
        if (!Array.isArray(current)) {
            current = (current === 'all') ? ['all'] : [current];
        }

        if (status === 'all') {
            current = ['all'];
        } else {
            // If 'all' was active, clear it
            if (current.includes('all')) {
                current = [];
            }

            // Toggle status
            if (current.includes(status)) {
                current = current.filter(s => s !== status);
            } else {
                current.push(status);
            }

            // If empty, revert to 'all'
            if (current.length === 0) {
                current = ['all'];
            }
        }

        this.currentFilter.status = current;
        // Don't reset genre automatically to allow combining
        // this.currentFilter.genre = null; 

        UI.setActiveStatusTab(current);
        // UI.setActiveGenreTab(null); // Keep genre styling
        this.loadBooks();
    },

    filterByGenre(genre) {
        if (this.currentFilter.genre === genre) {
            this.currentFilter.genre = null;
        } else {
            this.currentFilter.genre = genre;
        }
        UI.setActiveGenreTab(this.currentFilter.genre);
        this.loadBooks();
    },

    openAddModal(bookId = null) {
        // Close detail modal first to prevent z-index conflicts
        this.closeModal('modalDetail');

        const modal = document.getElementById('modalAdd');
        const title = document.getElementById('modalAddTitle');
        const form = document.getElementById('bookForm');

        form.reset();
        document.getElementById('bookId').value = bookId || '';
        document.getElementById('aiKeyword').value = '';
        document.getElementById('aiJsonInput').value = '';

        if (bookId) {
            title.textContent = '本を編集';
            const book = DataManager.getBook(bookId);
            if (book) {
                document.getElementById('bookTitle').value = book.title;
                document.getElementById('bookAuthor').value = book.author;
                document.getElementById('bookPublisher').value = book.publisher;
                document.getElementById('bookIsbn').value = book.isbn;
                document.getElementById('bookTotalPages').value = book.totalPages || '';
                document.getElementById('bookCurrentPage').value = book.currentPage || '';
                document.getElementById('bookStatus').value = book.status;
                document.getElementById('bookOwnership').value = book.ownership || '';
                document.getElementById('bookTags').value = (book.tags || []).join(', ');
                document.getElementById('bookCover').value = book.coverUrl || '';
            }
        } else {
            title.textContent = '本を追加';
        }

        this.openModal('modalAdd');
    },

    handleBookSubmit(e) {
        e.preventDefault();

        const bookId = document.getElementById('bookId').value;
        const bookData = {
            title: document.getElementById('bookTitle').value.trim(),
            author: document.getElementById('bookAuthor').value.trim(),
            publisher: document.getElementById('bookPublisher').value.trim(),
            isbn: document.getElementById('bookIsbn').value.trim(),
            totalPages: document.getElementById('bookTotalPages').value,
            currentPage: document.getElementById('bookCurrentPage').value,
            status: document.getElementById('bookStatus').value,
            ownership: document.getElementById('bookOwnership').value,
            tags: document.getElementById('bookTags').value,
            coverUrl: document.getElementById('bookCover').value.trim()
        };

        if (bookId) {
            DataManager.updateBook(bookId, bookData);
            UI.showToast('本を更新しました');
        } else {
            DataManager.addBook(bookData);
            UI.showToast('本を追加しました');
        }

        this.closeModal('modalAdd');
        this.loadBooks();
    },

    generatePrompt() {
        const keyword = document.getElementById('aiKeyword').value.trim();
        if (!keyword) {
            UI.showToast('キーワードを入力してください');
            return;
        }

        const existingTags = DataManager.getAllTags();
        const tagListStr = existingTags.length > 0 ? existingTags.join(', ') : 'なし';
        const validGenres = DataManager.validGenres.join(', ');

        const prompt = `あなたは厳格な書誌データ管理者です。
以下の手順で検索・検証を行い、JSONを作成してください。

1. **Webブラウジング機能を使って**、国立国会図書館(NDL)やAmazon等の信頼できるデータベースで書籍を検索する。
2. ISBN-13 (978...) を特定する。
3. **【重要】取得したISBNが正しいか、チェックデジット（13桁の数学的整合性）を確認する。**
4. 少しでも自信がない、または検索で見つからない場合は、推測せず "" (空文字) とする。捏造は禁止。

キーワード: "${keyword}"

【JSON出力ルール】
1. title: 正式な書名。
2. author: 著者名（日本人はスペースなし、複数はカンマ区切り、訳者は " (訳)" 付き）
3. publisher: 出版社名。
4. total_pages: 総ページ数（不明なら推測値）。
5. isbn: ISBN-13（あれば）。
6. status: 常に "買いたい"。
7. tags: カンマ区切り。先頭は必ず指定ジャンルから選択: [${validGenres}]
   既存タグ優先: [${tagListStr}]

\`\`\`json
{"title":"書名","author":"著者","publisher":"出版社","total_pages":200,"isbn":"","status":"買いたい","tags":"ジャンル, タグ"}
\`\`\``;

        navigator.clipboard.writeText(prompt).then(() => {
            UI.showToast('プロンプトをコピーしました！AIに貼り付けてください');
        }).catch(() => {
            UI.showToast('コピーに失敗しました');
        });
    },

    importJson() {
        const jsonInput = document.getElementById('aiJsonInput').value.trim();
        if (!jsonInput) {
            UI.showToast('JSONを貼り付けてください');
            return;
        }

        const parsed = DataManager.parseAIJson(jsonInput);
        if (!parsed) {
            UI.showToast('JSONの解析に失敗しました');
            return;
        }

        document.getElementById('bookTitle').value = parsed.title;
        document.getElementById('bookAuthor').value = parsed.author;
        document.getElementById('bookPublisher').value = parsed.publisher;
        document.getElementById('bookIsbn').value = parsed.isbn;
        document.getElementById('bookTotalPages').value = parsed.totalPages || '';
        document.getElementById('bookStatus').value = parsed.status;
        document.getElementById('bookTags').value = parsed.tags;

        UI.showToast('情報を入力しました');
    },

    // ===== Book Search API Methods =====
    async searchBookAPI() {
        const query = document.getElementById('bookSearchQuery').value.trim();
        if (!query) {
            UI.showToast('検索キーワードを入力してください');
            return;
        }

        const container = document.getElementById('searchResultsContainer');
        const loading = document.getElementById('searchLoading');
        const results = document.getElementById('searchResults');
        const btn = document.getElementById('btnSearchBook');

        // Show loading
        btn.disabled = true;
        container.classList.add('open');
        loading.classList.add('show');
        results.innerHTML = '';

        try {
            let bookResults = [];

            // Check if query looks like ISBN
            const cleanQuery = query.replace(/[-\s]/g, '');
            const isISBN = /^(97[89])?\d{9}[\dX]$/i.test(cleanQuery);

            if (isISBN) {
                // ISBN lookup
                const book = await BookAPI.fetchByISBN(query);
                if (book) {
                    bookResults = [book];
                }
            } else {
                // Title/Author search
                bookResults = await BookAPI.searchBooks(query, 8);
            }

            loading.classList.remove('show');

            if (bookResults.length === 0) {
                results.innerHTML = '<div class="no-results">該当する本が見つかりませんでした</div>';
            } else {
                results.innerHTML = bookResults.map((book, index) => this.renderSearchResult(book, index)).join('');
                // Bind click events
                results.querySelectorAll('.search-result-item').forEach((item, index) => {
                    item.addEventListener('click', () => this.selectSearchResult(bookResults[index]));
                });
            }
        } catch (error) {
            console.error('Book search failed:', error);
            loading.classList.remove('show');
            results.innerHTML = '<div class="no-results">検索に失敗しました。時間をおいて再度お試しください。</div>';
        } finally {
            btn.disabled = false;
        }
    },

    renderSearchResult(book, index) {
        const coverHtml = book.coverUrl
            ? `<img src="${book.coverUrl}" alt="${book.title}" onerror="this.parentElement.innerHTML='<span class=\\'no-cover\\'>📖</span>'">`
            : '<span class="no-cover">📖</span>';

        const metaParts = [];
        if (book.publisher) metaParts.push(book.publisher);
        if (book.publishYear) metaParts.push(book.publishYear);
        if (book.totalPages) metaParts.push(`${book.totalPages}p`);
        if (book.isbn) metaParts.push(`ISBN: ${book.isbn}`);

        return `
            <div class="search-result-item" data-index="${index}">
                <div class="result-cover">${coverHtml}</div>
                <div class="result-info">
                    <div class="result-title">${book.title}</div>
                    <div class="result-author">${book.author || '著者不明'}</div>
                    <div class="result-meta">${metaParts.join(' · ')}</div>
                </div>
            </div>
        `;
    },

    selectSearchResult(book) {
        // Fill in form fields
        document.getElementById('bookTitle').value = book.title || '';
        document.getElementById('bookAuthor').value = book.author || '';
        document.getElementById('bookPublisher').value = book.publisher || '';
        document.getElementById('bookIsbn').value = book.isbn || '';
        document.getElementById('bookTotalPages').value = book.totalPages || '';
        document.getElementById('bookCover').value = book.coverUrl || '';

        // Clear search
        document.getElementById('bookSearchQuery').value = '';
        document.getElementById('searchResultsContainer').classList.remove('open');
        document.getElementById('searchResults').innerHTML = '';

        UI.showToast(`「${book.title}」の情報を入力しました`);
    },

    openDetail(bookId) {
        const book = DataManager.getBook(bookId);
        if (!book) return;

        // Immersive Background Setup
        const modalContent = document.querySelector('#modalDetail .modal-content');
        if (book.coverUrl) {
            modalContent.style.setProperty('--book-cover', `url(${book.coverUrl})`);
            modalContent.classList.add('has-cover-bg');
        } else {
            modalContent.style.removeProperty('--book-cover');
            modalContent.classList.remove('has-cover-bg');
        }

        const body = document.getElementById('detailBody');
        const progress = DataManager.getProgress(book);
        const remaining = book.totalPages ? book.totalPages - book.currentPage : 0;

        const coverHtml = book.coverUrl
            ? `<img src="${book.coverUrl}" alt="${book.title}">`
            : `<span class="placeholder">📖</span>`;

        const tagsHtml = (book.tags || []).map((tag, i) => {
            const isGenre = i === 0;
            const color = isGenre ? DataManager.getGenreColor(tag) : '';
            return `<span class="book-tag ${isGenre ? 'genre' : ''}" style="${isGenre ? `--tag-color:${color}` : ''}">${tag}</span>`;
        }).join('');

        // Rating display (1-5 stars)
        const rating = book.rating || 0;
        const starsHtml = [1, 2, 3, 4, 5].map(i =>
            `<span class="star ${i <= rating ? 'filled' : ''}" data-value="${i}">★</span>`
        ).join('');

        // Ownership display (English)
        const ownershipLabels = {
            'owned': 'Owned',
            'borrowed': 'Borrowed',
            'digital': 'Digital',
            '': 'Unset'
        };
        const ownershipText = ownershipLabels[book.ownership || ''];

        // Status display (English)
        const statusLabels = {
            'reading': 'Reading',
            'finished': 'Finished',
            'wish': 'Wish'
        };
        const statusText = statusLabels[book.status] || '';

        const logsHtml = (book.readingLogs || []).slice(0, 5).map(log => `
            <div class="log-item">
                <span class="log-date">${log.date}</span>
                <div class="log-content">
                    <div class="log-pages">P.${log.page}</div>
                    ${log.memo ? `<div class="log-memo">${log.memo}</div>` : ''}
                </div>
            </div>
        `).join('') || '<p class="notes-empty">No logs</p>';

        let wishLinks = '';
        if (book.status === 'wish') {
            const searchQuery = encodeURIComponent(book.title + ' ' + book.author);
            wishLinks = `
                <div class="detail-section">
                    <h4>Purchase Links</h4>
                    <div class="external-links">
                        <a href="https://www.amazon.co.jp/s?k=${searchQuery}" target="_blank" class="external-link amazon">Amazon</a>
                        <a href="https://jp.mercari.com/search?keyword=${searchQuery}" target="_blank" class="external-link mercari">Mercari</a>
                        <a href="https://www.valuebooks.jp/shelf-items/list?search=${searchQuery}" target="_blank" class="external-link vb">ValueBooks</a>
                    </div>
                </div>
            `;
        }

        body.innerHTML = `
            <div class="detail-header">
                <div class="detail-cover">${coverHtml}</div>
                <div class="detail-meta">
                    <h3>${book.title}</h3>
                    <p class="author">${book.author || 'Unknown Author'}</p>
                    <p class="publisher">${book.publisher || ''} ${book.isbn ? '/ ' + book.isbn : ''}</p>
                    <div class="detail-tags">${tagsHtml}</div>
                </div>
            </div>
            
            <div class="detail-info-grid">
                <div class="info-item">
                    <label>Status</label>
                    <span class="status-value ${book.status}">${statusText}</span>
                </div>
                <div class="info-item">
                    <label>Ownership</label>
                    <span>${ownershipText}</span>
                </div>
                <div class="info-item rating-item">
                    <label>Rating</label>
                    <div class="star-rating" data-book-id="${book.id}">${starsHtml}</div>
                </div>
            </div>
            
            ${book.status === 'reading' || book.status === 'finished' ? `
            <div class="detail-section">
                <h4>Progress</h4>
                <div class="progress-display">
                    <div class="progress-circle" style="--progress: ${progress}">
                        <svg width="60" height="60">
                            <circle class="bg" cx="30" cy="30" r="25"/>
                            <circle class="fill" cx="30" cy="30" r="25"/>
                        </svg>
                        <span class="progress-text">${progress}%</span>
                    </div>
                    <div class="progress-info">
                        <div class="pages">${book.currentPage} / ${book.totalPages || '?'} p</div>
                        <div class="remaining">${remaining > 0 ? `${remaining} pages left` : 'Completed!'}</div>
                    </div>
                </div>
            </div>
            ` : ''}
            
            ${wishLinks}
            
            <div class="detail-section">
                <h4>Actions</h4>
                <div class="detail-actions">
                    ${book.status === 'reading' ? `<button class="action-btn primary" onclick="App.openLogModal('${book.id}')">Record Log</button>` : ''}
                    ${book.status === 'wish' ? `
                        <button class="action-btn success" onclick="App.changeStatus('${book.id}', 'reading', 'owned')">Purchase & Read</button>
                        <button class="action-btn" onclick="App.changeStatus('${book.id}', 'reading', 'borrowed')">Borrow & Read</button>
                    ` : ''}
                    ${book.status === 'reading' ? `<button class="action-btn success" onclick="App.changeStatus('${book.id}', 'finished')">Mark Finished</button>` : ''}
                    ${book.status === 'finished' ? `<button class="action-btn" onclick="App.changeStatus('${book.id}', 'reading')">Read Again</button>` : ''}
                    <button class="action-btn" onclick="App.openAddModal('${book.id}')">Edit</button>
                    <button class="action-btn danger" onclick="App.deleteBook('${book.id}')">Delete</button>
                </div>
            </div>
            
            <div class="detail-section">
                <h4>Reading Log</h4>
                <div class="reading-log">${logsHtml}</div>
            </div>
            
            <div class="detail-section">
                <h4>Notes</h4>
                <div class="notes-content" id="notesContent" contenteditable="false">
                    ${book.notes || '<span class="notes-empty">Tap to add notes...</span>'}
                </div>
                <div class="notes-actions">
                    <button class="btn-edit-notes" onclick="App.toggleNotesEdit('${book.id}')">Edit Note</button>
                </div>
            </div>
        `;

        // Bind star rating events
        body.querySelectorAll('.star').forEach(star => {
            star.addEventListener('click', () => {
                const value = parseInt(star.dataset.value);
                this.updateRating(book.id, value);
            });
        });

        document.getElementById('detailTitle').textContent = book.title;
        this.openModal('modalDetail');
    },

    updateRating(bookId, rating) {
        DataManager.updateBook(bookId, { rating });
        // Update UI
        document.querySelectorAll('.star-rating .star').forEach((star, i) => {
            star.classList.toggle('filled', i < rating);
        });
        UI.showToast(`評価を ${rating} に設定しました`);
    },

    toggleNotesEdit(bookId) {
        const notesEl = document.getElementById('notesContent');
        const isEditing = notesEl.contentEditable === 'true';

        if (isEditing) {
            // Save
            const notes = notesEl.innerText.trim();
            DataManager.updateBook(bookId, { notes: notes || '' });
            notesEl.contentEditable = 'false';
            notesEl.classList.remove('editing');
            UI.showToast('メモを保存しました');
        } else {
            // Edit mode
            if (notesEl.querySelector('.notes-empty')) {
                notesEl.innerHTML = '';
            }
            notesEl.contentEditable = 'true';
            notesEl.classList.add('editing');
            notesEl.focus();
        }
    },

    changeStatus(bookId, newStatus, ownership) {
        const updates = { status: newStatus };
        if (ownership) updates.ownership = ownership;
        DataManager.updateBook(bookId, updates);
        UI.showToast('ステータスを更新しました');
        this.closeModal('modalDetail');
        this.loadBooks();
    },

    deleteBook(bookId) {
        // Get book info for confirmation message
        const book = DataManager.getBook(bookId);
        if (!book) return;

        // Set the target book ID
        document.getElementById('deleteTargetId').value = bookId;
        document.getElementById('deleteConfirmMessage').textContent =
            `「${book.title}」を削除します。この操作は取り消せません。`;

        // Close detail modal and open delete confirmation modal
        this.closeModal('modalDetail');

        // Small delay to ensure modals don't conflict
        setTimeout(() => {
            this.openModal('modalDeleteConfirm');
        }, 100);
    },

    confirmDelete() {
        const bookId = document.getElementById('deleteTargetId').value;
        if (!bookId) return;

        DataManager.deleteBook(bookId);
        UI.showToast('本を削除しました');
        this.closeModal('modalDeleteConfirm');
        this.loadBooks();
    },

    openLogModal(bookId) {
        const book = DataManager.getBook(bookId);
        if (!book) return;

        document.getElementById('logBookId').value = bookId;
        document.getElementById('logPage').value = book.currentPage || '';
        document.getElementById('logMemo').value = '';
        document.getElementById('logPageHint').textContent = `現在: ${book.currentPage || 0} / ${book.totalPages || '?'} ページ`;

        this.closeModal('modalDetail');
        this.openModal('modalLog');
    },

    handleLogSubmit(e) {
        e.preventDefault();
        const bookId = document.getElementById('logBookId').value;
        const page = document.getElementById('logPage').value;
        const memo = document.getElementById('logMemo').value;

        DataManager.addReadingLog(bookId, { page, memo });
        UI.showToast('ログを記録しました');
        this.closeModal('modalLog');
        this.loadBooks();
    },

    openModal(id) {
        document.getElementById(id).classList.add('open');
        document.body.style.overflow = 'hidden';
    },

    closeModal(id) {
        document.getElementById(id).classList.remove('open');
        document.body.style.overflow = '';
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(err => {
                console.log('SW registration failed:', err);
            });
        }
    },

    // ===== AI Tag Assist Methods =====

    openAITagModal() {
        // Get books without tags (or with only empty tags)
        const allBooks = DataManager.getAllBooks();
        const untaggedBooks = allBooks.filter(book =>
            !book.tags || book.tags.length === 0 || (book.tags.length === 1 && book.tags[0] === '')
        );

        const listContainer = document.getElementById('untaggedBooksList');

        if (untaggedBooks.length === 0) {
            listContainer.innerHTML = '<p class="no-untagged">すべての本にタグが付いています ✓</p>';
        } else {
            listContainer.innerHTML = untaggedBooks.map(book => `
                <div class="untagged-book-item">
                    <span class="book-id">${book.id}</span>
                    <span class="book-title">${book.title}</span>
                    <span class="book-author">${book.author || '著者不明'}</span>
                </div>
            `).join('');
        }

        // Clear previous JSON input
        document.getElementById('aiTagJsonInput').value = '';

        this.openModal('modalAITag');
    },

    copyTagPrompt() {
        const allBooks = DataManager.getAllBooks();
        const untaggedBooks = allBooks.filter(book =>
            !book.tags || book.tags.length === 0 || (book.tags.length === 1 && book.tags[0] === '')
        );

        if (untaggedBooks.length === 0) {
            UI.showToast('タグなしの本がありません');
            return;
        }

        // Get all existing tags for consistency
        const existingTags = DataManager.getAllTags();
        const existingTagsStr = existingTags.length > 0 ? existingTags.join(', ') : 'なし';
        const validGenres = DataManager.validGenres.join(', ');

        // Format book list
        const bookList = untaggedBooks.map(book =>
            `- id: "${book.id}" / タイトル: "${book.title}" / 著者: "${book.author || '不明'}"`
        ).join('\n');

        const prompt = `あなたは書籍分類の専門家です。以下の本にタグを付けてください。

【ルール】
1. **主ジャンル（必須）**: 最初のタグは必ず以下から1つ選択:
   [${validGenres}]

2. **追加タグ**: 主ジャンル以外に2-4個のタグを付ける
   - 表記ゆれ防止のため、既存タグがあればそれを優先使用
   - 既存タグ一覧: [${existingTagsStr}]
   - 新しいタグは簡潔な日本語で（例: ベストセラー, 直木賞, 青春, 社会問題）

【タグなしの本】
${bookList}

【出力形式】
以下のJSON配列で出力してください（コードブロック不要）:
[
  {"id":"book_xxx","tags":["主ジャンル","タグ1","タグ2","タグ3"]},
  ...
]`;

        navigator.clipboard.writeText(prompt).then(() => {
            UI.showToast('プロンプトをコピーしました！外部AIに貼り付けてください');
        }).catch(() => {
            UI.showToast('コピーに失敗しました');
        });
    },

    applyAITags() {
        const jsonInput = document.getElementById('aiTagJsonInput').value.trim();
        if (!jsonInput) {
            UI.showToast('JSONを貼り付けてください');
            return;
        }

        try {
            // Parse JSON (handle potential markdown code block)
            let cleanJson = jsonInput;
            const match = jsonInput.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (match) {
                cleanJson = match[1].trim();
            }

            const tagsData = JSON.parse(cleanJson);

            if (!Array.isArray(tagsData)) {
                throw new Error('配列形式ではありません');
            }

            let updatedCount = 0;
            tagsData.forEach(item => {
                if (item.id && item.tags && Array.isArray(item.tags)) {
                    const book = DataManager.getBook(item.id);
                    if (book) {
                        DataManager.updateBook(item.id, { tags: item.tags });
                        updatedCount++;
                    }
                }
            });

            if (updatedCount > 0) {
                UI.showToast(`${updatedCount}冊の本にタグを適用しました`);
                this.closeModal('modalAITag');
                this.loadBooks();
            } else {
                UI.showToast('適用できる本が見つかりませんでした');
            }
        } catch (e) {
            console.error('Tag import failed:', e);
            UI.showToast('JSONの解析に失敗しました: ' + e.message);
        }
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App;
