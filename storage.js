import { initialState, validateState } from './data.js';
let database;
export function openStorage() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('dynamic-eisenhower', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('app');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Close other tabs of this app, then reload to upgrade storage.'));
    request.onsuccess = () => {
      database = request.result;
      database.onversionchange = () => { database.close(); location.reload(); };
      resolve();
    };
  });
}
export function readState() {
  return new Promise((resolve, reject) => {
    const tx = database.transaction('app', 'readonly');
    const request = tx.objectStore('app').get('state');
    request.onsuccess = () => { try { resolve(request.result ? validateState(request.result) : initialState()); } catch (error) { reject(error); } };
    request.onerror = () => reject(request.error);
  });
}
// Read and write in one transaction: concurrent tabs cannot silently lose each other's changes.
export function changeState(transform) {
  return new Promise((resolve, reject) => {
    const tx = database.transaction('app', 'readwrite');
    const store = tx.objectStore('app');
    let next, failure;
    const request = store.get('state');
    request.onsuccess = () => {
      try {
        const current = request.result ? validateState(request.result) : initialState();
        next = validateState(transform(current));
        store.put(next, 'state');
      } catch (error) { failure = error; tx.abort(); }
    };
    tx.oncomplete = () => resolve(next);
    tx.onabort = () => reject(failure || tx.error || new Error('The save was interrupted. Please try again.'));
    tx.onerror = () => { failure ||= tx.error; };
  });
}
