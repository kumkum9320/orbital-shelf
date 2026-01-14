/**
 * Firebase Configuration for Orbital Shelf
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBC_8dasAIey1J97GwwcQs4illTpDXJ-Ws",
    authDomain: "orbital-shelf.firebaseapp.com",
    projectId: "orbital-shelf",
    storageBucket: "orbital-shelf.firebasestorage.app",
    messagingSenderId: "468687600591",
    appId: "1:468687600591:web:c69e99377169790568b0ba"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const db = firebase.firestore();
const auth = firebase.auth();

// Auth state manager
const AuthManager = {
    currentUser: null,

    init() {
        return new Promise((resolve) => {
            auth.onAuthStateChanged((user) => {
                this.currentUser = user;
                if (user) {
                    console.log('Logged in as:', user.displayName);
                } else {
                    console.log('Not logged in');
                }
                resolve(user);
            });
        });
    },

    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            return result.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    },

    async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    },

    getUser() {
        return this.currentUser;
    },

    getUserId() {
        return this.currentUser ? this.currentUser.uid : null;
    }
};
