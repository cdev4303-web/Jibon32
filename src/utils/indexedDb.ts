import { Invoice, CatalogItem } from '../types';

const DB_NAME = 'JibonTailorDB';
const DB_VERSION = 1;
const STORE_INVOICES = 'invoices';
const STORE_PHOTOS = 'photos';

let dbPromise: Promise<IDBDatabase> | null = null;

function getDb(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_INVOICES)) {
          db.createObjectStore(STORE_INVOICES, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_PHOTOS)) {
          db.createObjectStore(STORE_PHOTOS, { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  return dbPromise;
}

/**
 * Saves full invoices into IndexedDB.
 */
export async function saveInvoicesToIndexedDb(invoices: Invoice[]): Promise<void> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INVOICES, 'readwrite');
      const store = tx.objectStore(STORE_INVOICES);

      // Clear existing and rewrite
      const clearReq = store.clear();
      clearReq.onsuccess = () => {
        for (const inv of invoices) {
          store.put(inv);
        }
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save invoices failed:', err);
  }
}

/**
 * Loads invoices from IndexedDB if available.
 */
export async function loadInvoicesFromIndexedDb(): Promise<Invoice[] | null> {
  try {
    const db = await getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_INVOICES, 'readonly');
      const store = tx.objectStore(STORE_INVOICES);
      const req = store.getAll();

      req.onsuccess = () => {
        const result = req.result as Invoice[];
        resolve(result && result.length > 0 ? result : null);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB load invoices failed:', err);
    return null;
  }
}
