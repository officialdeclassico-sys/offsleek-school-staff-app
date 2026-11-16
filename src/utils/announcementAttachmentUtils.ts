/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FirebaseError } from 'firebase/app';
import { getBlob, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../lib/firebase';
import { AnnouncementAttachment } from '../services/announcementsService';
import { getNowISO } from './dateTimeUtils';

export type AttachmentPreviewKind = 'pdf' | 'image' | 'unsupported';

export interface ResolvedAttachmentData {
  objectUrl: string;
  mimeType: string;
  kind: AttachmentPreviewKind;
  blob: Blob;
  filename: string;
}

type ExtendedAttachment = AnnouncementAttachment & {
  url?: string;
  fileUrl?: string;
  dataUrl?: string;
  storagePath?: string;
  mimeType?: string;
  type?: string;
};

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif']);
const ALLOWED_UPLOAD_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.doc', '.docx'];
export const MAX_ANNOUNCEMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const IDB_NAME = 'offsleek_announcement_attachments_db';
const IDB_STORE = 'attachments';
const IDB_VERSION = 1;

function openAttachmentsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('Persistent file storage (IndexedDB) is unavailable in this browser.'));
      return;
    }
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error('Failed to open local attachment storage.'));
  });
}

async function saveLocalAttachmentBlob(
  id: string,
  blob: Blob,
  name: string,
  contentType: string
): Promise<void> {
  const db = await openAttachmentsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put({ id, blob, name, contentType, savedAt: getNowISO() });
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to store attachment locally.'));
    };
  });
}

async function getLocalAttachmentBlob(id: string): Promise<Blob | null> {
  const db = await openAttachmentsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(id);
    req.onsuccess = () => {
      db.close();
      const record = req.result as { blob?: Blob } | undefined;
      resolve(record?.blob || null);
    };
    req.onerror = () => {
      db.close();
      reject(req.error || new Error('Failed to read attachment from local storage.'));
    };
  });
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}

function getFileExtension(filename: string): string {
  const clean = filename.split('?')[0].split('#')[0].trim();
  const idx = clean.lastIndexOf('.');
  if (idx === -1 || idx === clean.length - 1) return '';
  return clean.slice(idx + 1).toLowerCase();
}

function inferMimeFromExtension(filename: string): string {
  const ext = getFileExtension(filename);
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default:
      return 'application/octet-stream';
  }
}

function inferCategoryType(filename: string, contentType: string): 'pdf' | 'image' | 'file' {
  const ext = getFileExtension(filename);
  const mime = contentType.toLowerCase();
  if (ext === 'pdf' || mime.includes('pdf')) return 'pdf';
  if (IMAGE_EXTENSIONS.has(ext) || mime.startsWith('image/')) return 'image';
  return 'file';
}

export function getAttachmentBadgeLabel(attachment: AnnouncementAttachment): string {
  const ext = getFileExtension(attachment.name);
  if (ext === 'pdf' || attachment.type === 'pdf') return 'PDF';
  if (IMAGE_EXTENSIONS.has(ext) || attachment.type === 'image') return 'IMG';
  if (ext && ext.length <= 4) return ext.toUpperCase();
  return 'FILE';
}

export function getRawAttachmentReference(attachment: AnnouncementAttachment): string | null {
  const ext = attachment as ExtendedAttachment;
  const candidate =
    ext.downloadUrl?.trim() ||
    ext.url?.trim() ||
    ext.fileUrl?.trim() ||
    ext.dataUrl?.trim() ||
    ext.storagePath?.trim() ||
    '';
  return candidate.length > 0 ? candidate : null;
}

export function isValidUrlOrStorageRef(rawRef: string): boolean {
  if (!rawRef) return false;
  if (
    rawRef.startsWith('https://') ||
    rawRef.startsWith('http://') ||
    rawRef.startsWith('blob:') ||
    rawRef.startsWith('data:') ||
    rawRef.startsWith('/') ||
    rawRef.startsWith('gs://')
  ) {
    return true;
  }
  return /^[a-zA-Z0-9._-]+(\/[a-zA-Z0-9._~:/?#[\]@!$&'()*+,;=% -]+)+$/.test(rawRef);
}

export function inferAttachmentKind(
  attachment: AnnouncementAttachment,
  mimeType?: string
): AttachmentPreviewKind {
  const extObj = attachment as ExtendedAttachment;
  const normalizedMime = (mimeType || extObj.contentType || extObj.mimeType || '').toLowerCase();
  const ext = getFileExtension(attachment.name);

  if (normalizedMime === 'application/pdf' || normalizedMime.includes('/pdf')) {
    return 'pdf';
  }
  if (normalizedMime.startsWith('image/')) {
    return 'image';
  }
  if (ext === 'pdf') {
    return 'pdf';
  }
  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image';
  }
  if (attachment.type === 'pdf' && !ext) {
    return 'pdf';
  }
  if (attachment.type === 'image' && !ext) {
    return 'image';
  }
  return 'unsupported';
}

function normalizeFirebaseStoragePath(rawRef: string): string {
  if (rawRef.startsWith('gs://')) {
    const withoutScheme = rawRef.slice(5);
    const slashIndex = withoutScheme.indexOf('/');
    return slashIndex >= 0 ? withoutScheme.slice(slashIndex + 1) : '';
  }
  return rawRef.replace(/^\/+/, '');
}

function mapFirebaseStorageError(err: unknown, filename: string): Error {
  if (err instanceof FirebaseError) {
    if (err.code === 'storage/unauthorized' || err.code === 'storage/unauthenticated') {
      return new Error(
        `Access denied: you do not have permission to access "${filename}".`
      );
    }
    if (err.code === 'storage/object-not-found') {
      return new Error(`"${filename}" was not found in Firebase Storage.`);
    }
    if (err.code === 'storage/canceled') {
      return new Error(`Transfer of "${filename}" was canceled.`);
    }
  }
  return err instanceof Error
    ? err
    : new Error(`Unable to retrieve "${filename}" from Firebase Storage.`);
}

async function fetchFromStoragePath(rawRef: string, filename: string): Promise<Blob> {
  const path = normalizeFirebaseStoragePath(rawRef);
  if (!path) {
    throw new Error('Invalid Firebase Storage file reference.');
  }
  const storageRef = ref(storage, path);
  try {
    return await getBlob(storageRef);
  } catch (err) {
    if (
      err instanceof FirebaseError &&
      (err.code === 'storage/unauthorized' ||
        err.code === 'storage/unauthenticated' ||
        err.code === 'storage/object-not-found')
    ) {
      throw mapFirebaseStorageError(err, filename);
    }
    try {
      const downloadUrl = await getDownloadURL(storageRef);
      const response = await fetch(downloadUrl);
      if (response.status === 401 || response.status === 403) {
        throw new Error(`Access denied: permission required to load "${filename}".`);
      }
      if (!response.ok) {
        throw new Error(`Storage download failed (HTTP ${response.status}).`);
      }
      return await response.blob();
    } catch (innerErr) {
      throw mapFirebaseStorageError(innerErr, filename);
    }
  }
}

export async function uploadAnnouncementAttachment(
  file: File,
  schoolId: string,
  announcementId: string
): Promise<AnnouncementAttachment> {
  const lowerName = file.name.toLowerCase();
  const hasAllowedExt = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (!hasAllowedExt) {
    throw new Error(
      `"${file.name}" is not a supported format. Allowed: PDF, PNG, JPG, WEBP, DOC, DOCX.`
    );
  }
  if (file.size <= 0) {
    throw new Error(`"${file.name}" is empty and cannot be uploaded.`);
  }
  if (file.size > MAX_ANNOUNCEMENT_FILE_SIZE_BYTES) {
    throw new Error(
      `"${file.name}" exceeds the 10 MB size limit (${formatAttachmentSize(file.size)}).`
    );
  }

  const contentType = file.type || inferMimeFromExtension(file.name);
  const categoryType = inferCategoryType(file.name, contentType);
  const formattedSize = formatAttachmentSize(file.size);
  const uploadedAt = getNowISO();
  const sanitizedFileName = file.name.replace(/[/\\?#]/g, '_');

  // Use Firebase Storage when an authenticated session is active and the bucket is provisioned
  if (auth.currentUser) {
    const storagePath = `schools/${schoolId}/announcements/${announcementId}/${sanitizedFileName}`;
    const storageRef = ref(storage, storagePath);

    // Prevent default 10-minute Firebase Storage retry hang if bucket is unprovisioned
    const previousMaxRetry = storage.maxUploadRetryTime;
    storage.maxUploadRetryTime = 8000;
    try {
      await uploadBytes(storageRef, file, { contentType });
      const downloadUrl = await getDownloadURL(storageRef);
      return {
        name: file.name,
        size: formattedSize,
        sizeBytes: file.size,
        type: categoryType,
        contentType,
        downloadUrl,
        storagePath,
        storageProvider: 'firebase-storage',
        uploadedAt,
      };
    } catch (err) {
      if (
        err instanceof FirebaseError &&
        (err.code === 'storage/unauthorized' || err.code === 'storage/unauthenticated')
      ) {
        throw mapFirebaseStorageError(err, file.name);
      }
      // Fall through only if bucket is unprovisioned (404/unknown) in local persistence mode
    } finally {
      storage.maxUploadRetryTime = previousMaxRetry;
    }
  }

  // Persist exact uploaded binary in browser IndexedDB for reload-safe local persistence
  const localFileId = `att-${announcementId}-${Date.now()}`;
  await saveLocalAttachmentBlob(localFileId, file, file.name, contentType);

  return {
    name: file.name,
    size: formattedSize,
    sizeBytes: file.size,
    type: categoryType,
    contentType,
    localFileId,
    storageProvider: 'local-indexeddb',
    uploadedAt,
  };
}

export async function fetchAttachmentFile(
  attachment: AnnouncementAttachment,
  signal?: AbortSignal
): Promise<ResolvedAttachmentData> {
  // 1. Check persisted local IndexedDB attachment binary (from real uploaded files)
  if (attachment.localFileId) {
    const localBlob = await getLocalAttachmentBlob(attachment.localFileId);
    if (!localBlob) {
      throw new Error(
        `The uploaded file "${attachment.name}" is no longer available in local browser storage. Please re-upload it.`
      );
    }
    const effectiveMime =
      localBlob.type ||
      attachment.contentType ||
      inferMimeFromExtension(attachment.name);
    const kind = inferAttachmentKind(attachment, effectiveMime);
    const typedBlob =
      localBlob.type === effectiveMime
        ? localBlob
        : new Blob([localBlob], { type: effectiveMime });

    return {
      objectUrl: URL.createObjectURL(typedBlob),
      mimeType: effectiveMime,
      kind,
      blob: typedBlob,
      filename: attachment.name,
    };
  }

  // 2. Check downloadUrl or Firebase Storage path
  const rawRef = getRawAttachmentReference(attachment);
  if (!rawRef) {
    throw new Error(
      `No file URL or storage reference is attached for "${attachment.name}". The original file must be re-uploaded.`
    );
  }

  if (!isValidUrlOrStorageRef(rawRef)) {
    throw new Error(`The attachment reference for "${attachment.name}" is invalid.`);
  }

  let blob: Blob;
  let detectedMime = '';

  const isDirectWebUrl =
    rawRef.startsWith('https://') ||
    rawRef.startsWith('http://') ||
    rawRef.startsWith('blob:') ||
    rawRef.startsWith('data:') ||
    rawRef.startsWith('/');

  if (!isDirectWebUrl || rawRef.startsWith('gs://')) {
    blob = await fetchFromStoragePath(rawRef, attachment.name);
    detectedMime = blob.type || '';
  } else {
    let response: Response;
    try {
      response = await fetch(rawRef, { signal });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw err;
      }
      throw new Error(
        `Unable to retrieve "${attachment.name}". Check network connectivity or file permissions.`
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        `Access denied: you do not have permission to view "${attachment.name}".`
      );
    }
    if (!response.ok) {
      throw new Error(
        `Unable to load "${attachment.name}" (HTTP ${response.status}).`
      );
    }

    const headerMime = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    blob = await response.blob();
    detectedMime = (blob.type || headerMime || '').toLowerCase();

    const ext = getFileExtension(attachment.name);
    if (headerMime === 'text/html' && ext !== 'html' && ext !== 'htm') {
      throw new Error(
        `The file "${attachment.name}" could not be found at its attachment URL.`
      );
    }
  }

  if (!blob || blob.size === 0) {
    throw new Error(`The attachment "${attachment.name}" is empty or unavailable.`);
  }

  const kind = inferAttachmentKind(attachment, detectedMime);
  const effectiveMime =
    detectedMime ||
    attachment.contentType ||
    (kind === 'pdf' ? 'application/pdf' : inferMimeFromExtension(attachment.name));

  const typedBlob = blob.type === effectiveMime ? blob : new Blob([blob], { type: effectiveMime });
  const objectUrl = URL.createObjectURL(typedBlob);

  return {
    objectUrl,
    mimeType: effectiveMime,
    kind,
    blob: typedBlob,
    filename: attachment.name,
  };
}

export async function downloadAnnouncementAttachment(
  attachment: AnnouncementAttachment
): Promise<string> {
  const resolved = await fetchAttachmentFile(attachment);
  try {
    const link = document.createElement('a');
    link.href = resolved.objectUrl;
    link.download = resolved.filename || 'attachment';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return resolved.filename;
  } finally {
    setTimeout(() => {
      URL.revokeObjectURL(resolved.objectUrl);
    }, 1500);
  }
}
