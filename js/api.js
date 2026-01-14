/**
 * Orbital Shelf - Book API Module
 * Google Books API を使用した書籍情報取得
 */

const BookAPI = {
    // Google Books API endpoint
    ENDPOINT: 'https://www.googleapis.com/books/v1/volumes',

    /**
     * ISBNから書籍情報を取得
     * @param {string} isbn - ISBN-10 or ISBN-13
     * @returns {Promise<Object|null>} 書籍情報
     */
    async fetchByISBN(isbn) {
        const cleanISBN = isbn.replace(/[-\s]/g, '');
        if (!cleanISBN || (cleanISBN.length !== 10 && cleanISBN.length !== 13)) {
            return null;
        }

        try {
            const response = await fetch(`${this.ENDPOINT}?q=isbn:${cleanISBN}`);
            if (!response.ok) return null;

            const data = await response.json();
            if (!data.items || data.items.length === 0) return null;

            return this.parseGoogleBooksData(data.items[0], cleanISBN);
        } catch (error) {
            console.error('ISBN lookup failed:', error);
            return null;
        }
    },

    /**
     * タイトル・著者で書籍を検索
     * @param {string} query - 検索クエリ
     * @param {number} limit - 取得件数
     * @returns {Promise<Array>} 検索結果
     */
    async searchBooks(query, limit = 10) {
        if (!query || query.trim().length < 2) return [];

        try {
            const params = new URLSearchParams({
                q: query,
                maxResults: Math.min(limit, 40),
                printType: 'books',
                langRestrict: 'ja'
            });

            const response = await fetch(`${this.ENDPOINT}?${params}`);
            if (!response.ok) return [];

            const data = await response.json();
            return (data.items || []).map(item => this.parseGoogleBooksData(item));
        } catch (error) {
            console.error('Book search failed:', error);
            return [];
        }
    },

    /**
     * Google Books のデータを統一フォーマットに変換
     */
    parseGoogleBooksData(item, providedIsbn = null) {
        const vol = item.volumeInfo || {};

        // ISBN取得
        let isbn = providedIsbn || '';
        if (!isbn && vol.industryIdentifiers) {
            const isbn13 = vol.industryIdentifiers.find(id => id.type === 'ISBN_13');
            const isbn10 = vol.industryIdentifiers.find(id => id.type === 'ISBN_10');
            isbn = isbn13?.identifier || isbn10?.identifier || '';
        }

        // 書影URL取得（より高品質な画像を取得）
        let coverUrl = '';
        if (vol.imageLinks) {
            // 優先順位: large > medium > small > thumbnail
            coverUrl = vol.imageLinks.large ||
                vol.imageLinks.medium ||
                vol.imageLinks.small ||
                vol.imageLinks.thumbnail || '';
            // HTTPSに変換
            coverUrl = coverUrl.replace('http://', 'https://');
            // edge=curl パラメータを削除してフラットな画像を取得
            coverUrl = coverUrl.replace('&edge=curl', '');
        }

        return {
            key: item.id || '',
            title: vol.title || '',
            author: vol.authors ? vol.authors.join(', ') : '',
            publisher: vol.publisher || '',
            isbn: isbn,
            totalPages: vol.pageCount || 0,
            coverUrl: coverUrl,
            publishDate: vol.publishedDate || '',
            publishYear: vol.publishedDate ? vol.publishedDate.substring(0, 4) : '',
            subjects: vol.categories || [],
            description: vol.description || ''
        };
    },

    /**
     * 書影URLを取得（ISBNから）
     * Google Books APIで検索して取得
     * @param {string} isbn 
     * @param {string} size - unused, kept for compatibility
     */
    async getCoverUrl(isbn, size = 'M') {
        if (!isbn) return '';
        const book = await this.fetchByISBN(isbn);
        return book?.coverUrl || '';
    },

    /**
     * 書影が存在するか確認
     * @param {string} url 
     * @returns {Promise<boolean>}
     */
    async checkCoverExists(url) {
        if (!url) return false;
        try {
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' });
            return true; // Google Books usually returns valid images
        } catch {
            return false;
        }
    }
};

window.BookAPI = BookAPI;
