/**
 * Orbital Shelf - Data Management Module
 */

const DataManager = {
    STORAGE_KEY: 'orbital_shelf_books',

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

    generateId() {
        return 'book_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    getAllBooks() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error reading from localStorage:', e);
            return [];
        }
    },

    saveAllBooks(books) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(books));
            return true;
        } catch (e) {
            console.error('Error saving to localStorage:', e);
            return false;
        }
    },

    getBook(id) {
        return this.getAllBooks().find(book => book.id === id);
    },

    addBook(bookData) {
        const books = this.getAllBooks();
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
        books.unshift(newBook);
        this.saveAllBooks(books);
        return newBook;
    },

    updateBook(id, updates) {
        const books = this.getAllBooks();
        const index = books.findIndex(book => book.id === id);
        if (index === -1) return null;
        if (updates.tags && typeof updates.tags === 'string') {
            updates.tags = updates.tags.split(',').map(t => t.trim()).filter(t => t);
        }
        books[index] = { ...books[index], ...updates, updatedAt: new Date().toISOString() };
        this.saveAllBooks(books);
        return books[index];
    },

    deleteBook(id) {
        const books = this.getAllBooks();
        const filtered = books.filter(book => book.id !== id);
        if (filtered.length === books.length) return false;
        this.saveAllBooks(filtered);
        return true;
    },

    addReadingLog(bookId, logEntry) {
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
        return this.updateBook(bookId, {
            readingLogs: book.readingLogs,
            currentPage: book.currentPage,
            status: book.status
        });
    },

    getAllTags() {
        const books = this.getAllBooks();
        const tagSet = new Set();
        books.forEach(book => {
            if (Array.isArray(book.tags)) book.tags.forEach(tag => tagSet.add(tag));
        });
        return Array.from(tagSet);
    },

    getAllGenres() {
        const books = this.getAllBooks();
        const genreSet = new Set();
        books.forEach(book => {
            if (Array.isArray(book.tags) && book.tags.length > 0) genreSet.add(book.tags[0]);
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
        let books = this.getAllBooks();
        if (criteria.status && criteria.status !== 'all') {
            books = books.filter(book => book.status === criteria.status);
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

    initializeSampleData() {
        if (this.getAllBooks().length > 0) return;
        const sampleBooks = [
            { title: 'ノルウェイの森', author: '村上春樹', publisher: '講談社', totalPages: 464, currentPage: 120, isbn: '9784062748681', status: 'reading', ownership: 'owned', tags: ['文芸', '恋愛', 'ベストセラー'], readingLogs: [{ date: '2026-01-13', page: 120, memo: '静かな雰囲気がいい' }] },
            { title: '容疑者Xの献身', author: '東野圭吾', publisher: '文藝春秋', totalPages: 394, currentPage: 394, isbn: '9784167110123', status: 'finished', ownership: 'owned', tags: ['ミステリー', '直木賞'], notes: '天才数学者の献身的な愛に感動' },
            { title: '三体', author: '劉慈欣, 大森望 (訳)', publisher: '早川書房', totalPages: 424, currentPage: 0, isbn: '9784150121570', status: 'wish', tags: ['SF', '中国文学', 'ヒューゴー賞'] }
        ];
        sampleBooks.forEach(book => this.addBook(book));
    }
};

window.DataManager = DataManager;
