// js/db.js
// Offline IndexedDB Wrapper for LRMS

const DB_NAME = 'lrms_offline_db';
const DB_VERSION = 3;

window.db = {
    _db: null,
    
    init: function() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                
                if (!db.objectStoreNames.contains('customers')) {
                    db.createObjectStore('customers', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('actions')) {
                    const actionStore = db.createObjectStore('actions', { keyPath: 'id' });
                    actionStore.createIndex('customerAccountNo', 'customerAccountNo', { unique: false });
                    actionStore.createIndex('followUpDate', 'followUpDate', { unique: false });
                }
                if (!db.objectStoreNames.contains('documents')) {
                    const docStore = db.createObjectStore('documents', { keyPath: 'id' });
                    docStore.createIndex('customerAccountNo', 'customerAccountNo', { unique: false });
                }
                if (!db.objectStoreNames.contains('users')) {
                    const userStore = db.createObjectStore('users', { keyPath: 'id' });
                    userStore.createIndex('username', 'username', { unique: true });
                }
                if (!db.objectStoreNames.contains('activity_logs')) {
                    const logStore = db.createObjectStore('activity_logs', { keyPath: 'id' });
                    logStore.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
            
            request.onsuccess = (e) => {
                this._db = e.target.result;
                resolve(this._db);
            };
            
            request.onerror = (e) => {
                console.error("IndexedDB error:", e.target.error);
                reject(e.target.error);
            };
        });
    },

    getDB: async function() {
        if (!this._db) {
            await this.init();
        }
        return this._db;
    },

    uuidv4: function() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },

    add: async function(storeName, data) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            data.id = data.id || this.uuidv4();
            const request = store.add(data);
            request.onsuccess = () => resolve(data.id);
            request.onerror = () => reject(request.error);
        });
    },

    set: async function(storeName, data) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            if (!data.id) data.id = this.uuidv4();
            const request = store.put(data);
            request.onsuccess = () => resolve(data.id);
            request.onerror = () => reject(request.error);
        });
    },

    get: async function(storeName, id) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getAll: async function(storeName) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    getByIndex: async function(storeName, indexName, value) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    },

    update: async function(storeName, id, updates) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const getRequest = store.get(id);
            getRequest.onsuccess = () => {
                const data = getRequest.result;
                if (!data) return reject(new Error('Document not found'));
                const updatedData = { ...data, ...updates };
                const putRequest = store.put(updatedData);
                putRequest.onsuccess = () => resolve(true);
                putRequest.onerror = () => reject(putRequest.error);
            };
            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    delete: async function(storeName, id) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.delete(id);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    },

    clear: async function(storeName) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            const request = store.clear();
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }
};

// Initialize DB on load
window.db.init().catch(err => console.error("Failed to initialize offline DB", err));
