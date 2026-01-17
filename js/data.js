/**
 * Orbital Shelf - Data Management Module (Firebase Firestore版)
 */

const DataManager = {
    STORAGE_KEY: 'orbital_shelf_books',
    localCache: [],
    isOnline: false,

    genreColors: {
        'ミステリー': 'var(--genre-mystery)',
        '恋愛': 'var(--genre-romance)',
        'SF': 'var(--genre-sf)',
        'ホラー': 'var(--genre-horror)',
        '歴史': 'var(--genre-history)',
        'ライトノベル': 'var(--genre-lightnovel)',
        '文芸': 'var(--genre-literature)',
        '自然科学': 'var(--genre-science)',
        '歴史・地理': 'var(--genre-geography)',
        '政治・経済': 'var(--genre-politics)',
        'ビジネス': 'var(--genre-business)',
        '技術・IT': 'var(--genre-tech)',
        '哲学・宗教': 'var(--genre-philosophy)',
        '自己啓発': 'var(--genre-selfhelp)',
        '生活・料理': 'var(--genre-lifestyle)',
        '芸術': 'var(--genre-art)',
        'スポーツ': 'var(--genre-sports)',
        'エッセイ': 'var(--genre-essay)',
        'ノンフィクション': 'var(--genre-nonfiction)',
        '語学': 'var(--genre-language)',
        '絵本': 'var(--genre-picture)',
        '漫画': 'var(--genre-manga)'
    },

    validGenres: [
        'ミステリー', '恋愛', 'SF', 'ホラー', '歴史', 'ライトノベル', '文芸',
        '自然科学', '歴史・地理', '政治・経済', 'ビジネス', '技術・IT',
        '哲学・宗教', '自己啓発', '生活・料理', '芸術', 'スポーツ',
        'エッセイ', 'ノンフィクション', '語学', '絵本', '漫画'
    ],

    // Firestore collection reference
    getBooksCollection() {
        const userId = AuthManager.getUserId();
        if (!userId) return null;
        return db.collection('users').doc(userId).collection('books');
    },

    generateId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Get all books (from Firestore if online, otherwise from local cache)
    getAllBooks() {
        return this.localCache;
    },

    // Load books from Firestore
    async loadFromFirestore() {
        const collection = this.getBooksCollection();
        if (!collection) {
            this.isOnline = false;
            return this.loadFromLocal();
        }

        try {
            const snapshot = await collection.orderBy('createdAt', 'desc').get();
            this.localCache = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.saveToLocal(); // Cache locally
            this.isOnline = true;
            console.log('Loaded', this.localCache.length, 'books from Firestore');
            return this.localCache;
        } catch (error) {
            console.error('Firestore load error:', error);
            return this.loadFromLocal();
        }
    },

    // Load from local storage (fallback)
    loadFromLocal() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            this.localCache = data ? JSON.parse(data) : [];
            this.isOnline = false;
            return this.localCache;
        } catch (e) {
            console.error('LocalStorage load error:', e);
            this.localCache = [];
            return [];
        }
    },

    // Save to local storage
    saveToLocal() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.localCache));
        } catch (e) {
            console.error('LocalStorage save error:', e);
        }
    },

    getBook(id) {
        return this.localCache.find(book => book.id === id);
    },

    async addBook(bookData) {
        const newBook = {
            id: this.generateId(),
            title: bookData.title || '',
            author: bookData.author || '',
            publisher: bookData.publisher || '',
            totalPages: parseInt(bookData.totalPages) || 0,
            currentPage: parseInt(bookData.currentPage) || 0,
            isbn: bookData.isbn || '',
            status: bookData.status || 'wish',
            ownership: bookData.ownership || '',
            tags: Array.isArray(bookData.tags) ? bookData.tags :
                (bookData.tags ? bookData.tags.split(',').map(t => t.trim()).filter(t => t) : []),
            coverUrl: bookData.coverUrl || '',
            notes: bookData.notes || '',
            readingLogs: bookData.readingLogs || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        // Add to local cache first
        this.localCache.unshift(newBook);
        this.saveToLocal();

        // Sync to Firestore
        const collection = this.getBooksCollection();
        if (collection) {
            try {
                await collection.doc(newBook.id).set(newBook);
                console.log('Book saved to Firestore:', newBook.title);
            } catch (error) {
                console.error('Firestore save error:', error);
            }
        }

        return newBook;
    },

    async updateBook(id, updates) {
        const index = this.localCache.findIndex(book => book.id === id);
        if (index === -1) return null;

        if (updates.tags && typeof updates.tags === 'string') {
            updates.tags = updates.tags.split(',').map(t => t.trim()).filter(t => t);
        }

        const updatedBook = {
            ...this.localCache[index],
            ...updates,
            updatedAt: new Date().toISOString()
        };

        this.localCache[index] = updatedBook;
        this.saveToLocal();

        // Sync to Firestore
        const collection = this.getBooksCollection();
        if (collection) {
            try {
                await collection.doc(id).update(updates);
            } catch (error) {
                console.error('Firestore update error:', error);
            }
        }

        return updatedBook;
    },

    async deleteBook(id) {
        const filtered = this.localCache.filter(book => book.id !== id);
        if (filtered.length === this.localCache.length) return false;

        this.localCache = filtered;
        this.saveToLocal();

        // Sync to Firestore
        const collection = this.getBooksCollection();
        if (collection) {
            try {
                await collection.doc(id).delete();
                console.log('Book deleted from Firestore');
            } catch (error) {
                console.error('Firestore delete error:', error);
            }
        }

        return true;
    },

    async addReadingLog(bookId, logEntry) {
        const book = this.getBook(bookId);
        if (!book) return null;

        const log = {
            date: new Date().toISOString().split('T')[0],
            page: parseInt(logEntry.page) || 0,
            memo: logEntry.memo || ''
        };

        book.readingLogs = book.readingLogs || [];
        book.readingLogs.unshift(log);
        book.currentPage = log.page;

        if (book.totalPages && log.page >= book.totalPages) {
            book.status = 'finished';
        } else if (log.page > 0 && book.status === 'wish') {
            book.status = 'reading';
        }

        return await this.updateBook(bookId, {
            readingLogs: book.readingLogs,
            currentPage: book.currentPage,
            status: book.status
        });
    },

    getAllTags() {
        const tagSet = new Set();
        (this.localCache || []).forEach(book => {
            if (book && Array.isArray(book.tags)) book.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    },

    getAllGenres() {
        const genreSet = new Set();
        (this.localCache || []).forEach(book => {
            if (book && Array.isArray(book.tags) && book.tags.length > 0) genreSet.add(book.tags[0]);
        });
        return Array.from(genreSet);
    },

    getGenreColor(genre) {
        return this.genreColors[genre] || 'var(--genre-default)';
    },

    getProgress(book) {
        if (!book.totalPages || book.totalPages === 0) return 0;
        return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
    },

    filterBooks(criteria = {}) {
        let books = this.localCache;
        if (criteria.status && criteria.status !== 'all') {
            if (Array.isArray(criteria.status)) {
                if (criteria.status.length > 0 && !criteria.status.includes('all')) {
                    books = books.filter(book => criteria.status.includes(book.status));
                }
            } else {
                books = books.filter(book => book.status === criteria.status);
            }
        }
        if (criteria.genre) {
            books = books.filter(book => Array.isArray(book.tags) && book.tags[0] === criteria.genre);
        }
        if (criteria.query) {
            const q = criteria.query.toLowerCase();
            books = books.filter(book =>
                book.title.toLowerCase().includes(q) ||
                book.author.toLowerCase().includes(q) ||
                (Array.isArray(book.tags) && book.tags.some(tag => tag.toLowerCase().includes(q)))
            );
        }
        return books;
    },

    getStatusText(status) {
        const map = { 'wish': 'WISH', 'reading': 'READING', 'finished': 'FINISHED' };
        return map[status] || status.toUpperCase();
    },

    mapStatus(status) {
        const map = { '買いたい': 'wish', '読書中': 'reading', '読了': 'finished' };
        return map[status] || status || 'wish';
    },

    parseAIJson(jsonString) {
        try {
            const match = jsonString.match(/```(?:json)?\s*([\s\S]*?)```/);
            const cleanJson = match ? match[1].trim() : jsonString.trim();
            const data = JSON.parse(cleanJson);
            return {
                title: data.title || '',
                author: data.author || '',
                publisher: data.publisher || '',
                totalPages: data.total_pages || data.totalPages || 0,
                isbn: data.isbn || '',
                status: this.mapStatus(data.status),
                tags: data.tags || ''
            };
        } catch (e) {
            console.error('Error parsing AI JSON:', e);
            return null;
        }
    },

    // Migrate local data to Firestore (for first-time sync)
    async migrateLocalToFirestore() {
        const collection = this.getBooksCollection();
        if (!collection) return;

        const localData = localStorage.getItem(this.STORAGE_KEY);
        if (!localData) return;

        const localBooks = JSON.parse(localData);
        if (localBooks.length === 0) return;

        // Check if Firestore already has data
        const snapshot = await collection.limit(1).get();
        if (!snapshot.empty) {
            console.log('Firestore already has data, skipping migration');
            return;
        }

        // Migrate local books to Firestore
        console.log('Migrating', localBooks.length, 'books to Firestore...');
        for (const book of localBooks) {
            try {
                await collection.doc(book.id).set(book);
            } catch (error) {
                console.error('Migration error for book:', book.title, error);
            }
        }
        console.log('Migration complete!');
    },

    initializeSampleData() {
        // Only initialize sample data if completely empty
        if (this.localCache.length > 0) return;
        // Sample data will be loaded from Firestore if available
    }
};

window.DataManager = DataManager;
