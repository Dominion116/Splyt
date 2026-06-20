"use client";

import type { DraftSession } from "./types";

const DB_NAME = "splyt";
const DB_VERSION = 1;
const STORE = "drafts";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, runner: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(STORE, mode);
    const store = transaction.objectStore(STORE);
    const req = runner(store);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

interface StoredDraft extends Omit<DraftSession, "members"> {
  members: string[];
}

export async function getDraft(id: string): Promise<DraftSession | null> {
  if (typeof indexedDB === "undefined") return null;
  const raw = (await tx<StoredDraft | undefined>("readonly", (s) => s.get(id))) ?? null;
  if (!raw) return null;
  return raw as DraftSession;
}

export async function putDraft(draft: DraftSession): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await tx("readwrite", (s) => s.put(draft));
}

export async function deleteDraft(id: string): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  await tx("readwrite", (s) => s.delete(id));
}

export async function listDrafts(): Promise<DraftSession[]> {
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  return new Promise<DraftSession[]>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readonly");
    const store = transaction.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as DraftSession[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function purgeOldDrafts(olderThanDays: number): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
  const all = await listDrafts();
  await Promise.all(
    all.filter((d) => d.createdAt < cutoff).map((d) => deleteDraft(d.id))
  );
}
