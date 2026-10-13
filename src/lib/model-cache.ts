import type { DownloadProgress } from '../models/types';

const DB_NAME = 'unmark';
const DB_VERSION = 1;
const STORE = 'models';
const MODEL_KEY_PREFIX = 'migan_';
const MODEL_KEY = `${MODEL_KEY_PREFIX}v1`;

const MODEL_URL =
  'https://huggingface.co/lxfater/inpaint-web/resolve/main/migan.onnx';

const MODEL_SHA256 =
  'bb7189b2523b8485d9dd6baa2e7e8bccce4493760daa33ffcd432f667945bf62';

// Open IndexedDB Database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Get data from IndexedDB
async function idbGet<T = ArrayBuffer>(key: string): Promise<T | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

// Write data to IndexedDB
async function idbSet(key: string, value: ArrayBuffer): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const req = tx.objectStore(STORE).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// Delete from IndexedDB
async function idbDeleteOldKeys(keepKey: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.getAllKeys();
    req.onsuccess = () => {
      for (const key of req.result) {
        if (
          key !== keepKey &&
          typeof key === 'string' &&
          (key.startsWith(MODEL_KEY_PREFIX) || key.startsWith('lama_'))
        ) {
          store.delete(key);
        }
      }
      resolve();
    };
    req.onerror = () => resolve();
  });
}

// SHA256 Verification
async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hex = await crypto.subtle.digest(
    'SHA-256',
    new Uint8Array(bytes).buffer,
  );
  return Array.from(new Uint8Array(hex))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Verify sha256 hash
async function verifyModelBytes(
  bytes: Uint8Array,
  source: string,
): Promise<void> {
  if (!MODEL_SHA256) return;
  if (!globalThis.crypto?.subtle) {
    console.warn(
      '[model-cache] crypto.subtle unavailable - skipping integrity check.',
    );
  }
  const hash = await sha256Hex(bytes);
  if (hash !== MODEL_SHA256) {
    throw new Error(
      `Model integrity check failed — the file from ${source} does not match the ` +
        `expected SHA-256. Expected ${MODEL_SHA256.slice(0, 16)}…, got ${hash.slice(0, 16)}…. ` +
        `The model was not loaded.`,
    );
  }
  console.log(
    `[model-cache] ✓ Integrity verified (SHA-256 matches) - ${source}`,
  );
}

async function fetchWithProgress(
  url: string,
  onProgress?: (p: DownloadProgress) => void,
): Promise<Uint8Array> {
  let res: Response;
  try {
    res = await fetch(url, { cache: 'force-cache' });
  } catch (error) {
    // Network failure or cors rejection
    const isCors = String(error).toLowerCase().includes('cors');
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      isCors
        ? `Blocked by browser security (CORS). The model URL must be served with proper CORS headers. URL: ${url}`
        : `Network error while downloading the model. Check your internet connection. (${msg})`,
      { cause: error },
    );
  }

  if (!res.ok) {
    if (res.status === 404 || res.status === 401 || res.status === 403) {
      throw new Error(
        `Model file not found at the configured URL (HTTP ${res.status}). ` +
          `This usually means the maintainer hasn't uploaded the model yet — ` +
          `see README "One-time model setup" or edit MODEL_URL in src/lib/model-cache.ts.`,
      );
    }
    throw new Error(
      `Could not download model (HTTP ${res.status} ${res.statusText}).`,
    );
  }

  const total = parseInt(res.headers.get('content-length') || '0', 10);
  if (!res.body) {
    const buf = await res.arrayBuffer();
    onProgress?.({
      done: buf.byteLength,
      total: buf.byteLength,
      stage: 'Downloaded',
    });
    return new Uint8Array(buf);
  }

  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let done = 0;
  while (true) {
    const { value, done: finished } = await reader.read();
    if (finished) break;
    chunks.push(value);
    done += value.byteLength;
    onProgress?.({ done, total, stage: 'Downloading model' });
  }
  const output = new Uint8Array(done);
  let offset = 0;
  for (const c of chunks) {
    output.set(c, offset);
    offset += c.byteLength;
  }
  return output;
}

async function requestPersistentStorage(): Promise<boolean> {
  if (!navigator.storage || !navigator.storage.persist) {
    console.log('[model-cache] Persistent storage API not supported');
    return false;
  }
  try {
    const already = await navigator.storage.persisted();
    if (already) {
      console.log('[model-cache] Persistent storage already granted');
      return true;
    }
    const granted = await navigator.storage.persist();
    console.log(
      `[model-cache] Persistent storage requested: ${granted ? 'GRANTED' : 'DENIED'}`,
    );
    return granted;
  } catch (error) {
    console.warn('[model-cache] persist() failed', error);
    return false;
  }
}

// === Main API ===

export async function isModelCached(): Promise<boolean> {
  try {
    const cached = await idbGet(MODEL_KEY);
    return !!(cached && cached.byteLength > 1_000_000);
  } catch {
    return false;
  }
}

export async function clearModel(): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      const req = tx.objectStore(STORE).delete(MODEL_KEY);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
    });
  } catch {
    return false;
  }
}

// Load the model from IndexedDB cache if present, else download with progress
export async function loadModel(
  onProgress?: (p: DownloadProgress) => void,
): Promise<Uint8Array> {
  // 1. Try IndexedDB cache
  try {
    const cached = await idbGet(MODEL_KEY);
    if (cached && cached.byteLength > 1_000_000) {
      console.log(
        `[model-cache] HIT — model loaded from IndexedDB (${(cached.byteLength / 1024 / 1024).toFixed(1)} MB)`,
      );
      onProgress?.({
        done: cached.byteLength,
        total: cached.byteLength,
        cached: true,
        stage: 'Loaded from your device',
      });
      return new Uint8Array(cached);
    }
    console.log('[model-cache] MISS — no cached model found, will download');
  } catch (error) {
    console.warn(
      '[model-cache] IndexedDB read failed, will re-download:',
      error,
    );
  }

  // Ask for persistent storage before the big download so the browser
  // doesn't decide to evict us later.
  await requestPersistentStorage();

  // 2. Download the model
  onProgress?.({ done: 0, total: 0, stage: 'Connecting...' });
  const bytes = await fetchWithProgress(MODEL_URL, onProgress);
  console.log(
    `[model-cache] Downloaded ${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB`,
  );

  // 3. Verify before caching
  onProgress?.({
    done: bytes.byteLength,
    total: bytes.byteLength,
    stage: 'Verifying...',
  });
  await verifyModelBytes(bytes, 'the download');

  // 4. Save to IndexedDB so the next visit skips the download entirely
  try {
    await idbDeleteOldKeys(MODEL_KEY);
    await idbSet(MODEL_KEY, bytes.buffer as ArrayBuffer);
    const verifyRead = await idbGet<ArrayBuffer>(MODEL_KEY);
    if (verifyRead && verifyRead.byteLength === bytes.byteLength) {
      console.log(
        `[model-cache] ✓ Saved to IndexedDB (${(bytes.byteLength / 1024 / 1024).toFixed(1)} MB)`,
      );
    } else {
      console.error(
        '[model-cache] ✗ IndexedDB write appeared to succeed but read-back failed.',
      );
    }
  } catch (error) {
    console.error('[model-cache] ✗ Could not save model to IndexedDB:', error);
  }

  return bytes;
}
