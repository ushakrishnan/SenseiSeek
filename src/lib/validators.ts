// Small runtime validators for Firestore documents used in server actions
// Keep them minimal and focused on fields actually consumed by the code.

export type FirestoreTimestampLike = { toDate: () => Date };

export type ExecutiveProfile = {
  id?: string;
  name?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  // other fields are intentionally left loose
  [k: string]: unknown;
};

export type StartupProfile = {
  id?: string;
  companyName?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  [k: string]: unknown;
};

export type StartupNeed = {
  id?: string;
  creatorId?: string;
  companyName?: string;
  roleTitle?: string;
  status?: string;
  createdAt?: FirestoreTimestampLike;
  updatedAt?: FirestoreTimestampLike;
  [k: string]: unknown;
};

export function isExecutiveProfile(obj: unknown): obj is ExecutiveProfile {
  return typeof obj === 'object' && obj !== null && (Object.prototype.hasOwnProperty.call(obj, 'name') || Object.prototype.hasOwnProperty.call(obj, 'createdAt'));
}

export function isStartupProfile(obj: unknown): obj is StartupProfile {
  return typeof obj === 'object' && obj !== null && (Object.prototype.hasOwnProperty.call(obj, 'companyName') || Object.prototype.hasOwnProperty.call(obj, 'createdAt'));
}

export function isStartupNeed(obj: unknown): obj is StartupNeed {
  return typeof obj === 'object' && obj !== null && (Object.prototype.hasOwnProperty.call(obj, 'creatorId') || Object.prototype.hasOwnProperty.call(obj, 'roleTitle'));
}

export function toISODate(ts: FirestoreTimestampLike | Date | string | undefined): string | undefined {
  try {
    if (!ts) return undefined;
    if (typeof ts === 'string') {
      // assume ISO string
      const d = new Date(ts);
      if (isNaN(d.getTime())) return undefined;
      return d.toISOString();
    }
    if (ts instanceof Date) return ts.toISOString();
    // Firestore-like object with toDate()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (ts as any).toDate === 'function') {
      return (ts as FirestoreTimestampLike).toDate().toISOString();
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}

// Helper: safely read a Firestore timestamp-like field from an unknown object and
// return its ISO string (or undefined). We centralize the single `as any` in this
// module so other files don't need to cast.
export function getTimestamp(obj: unknown, key: string): string | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (obj as any)[key] as FirestoreTimestampLike | Date | string | undefined;
    return toISODate(v);
  } catch {
    return undefined;
  }
}

// Helper: return a Date instance from a timestamp-like field when available.
export function getDate(obj: unknown, key: string): Date | undefined {
  if (typeof obj !== 'object' || obj === null) return undefined;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const v = (obj as any)[key] as FirestoreTimestampLike | Date | string | undefined;
    if (!v) return undefined;
    if (v instanceof Date) return v;
    if (typeof v === 'string') {
      const d = new Date(v);
      return isNaN(d.getTime()) ? undefined : d;
    }
    if (typeof (v as any).toDate === 'function') return (v as FirestoreTimestampLike).toDate();
    return undefined;
  } catch {
    return undefined;
  }
}

// --- zod-based list of parsers to validate Firestore document payloads ---
import { z } from 'zod';
import { executiveProfileSchema, startupProfileSchema, startupNeedsSchema } from './schemas';

// Parse a raw Firestore document (unknown) into the shape validated by `executiveProfileSchema`.
export function parseExecutiveProfile(raw: unknown) {
  try {
    const parsed = executiveProfileSchema.partial().safeParse(raw || {});
    if (parsed.success) {
      // preserve timestamp-like fields from the original raw object so callers
      // can access createdAt/updatedAt even when zod parsing strips unknown keys
      const data: any = parsed.data as any;
      if (typeof raw === 'object' && raw !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = raw as any;
        if (r.createdAt !== undefined) data.createdAt = r.createdAt;
        if (r.updatedAt !== undefined) data.updatedAt = r.updatedAt;
      }
      return data;
    }
  } catch (e) {
    // fallthrough
  }
  return null;
}

export function parseStartupProfile(raw: unknown) {
  try {
    const parsed = startupProfileSchema.partial().safeParse(raw || {});
    if (parsed.success) {
      const data: any = parsed.data as any;
      if (typeof raw === 'object' && raw !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = raw as any;
        if (r.createdAt !== undefined) data.createdAt = r.createdAt;
        if (r.updatedAt !== undefined) data.updatedAt = r.updatedAt;
      }
      return data;
    }
  } catch (e) {
    // fallthrough
  }
  return null;
}

export function parseStartupNeed(raw: unknown) {
  try {
    const parsed = startupNeedsSchema.partial().safeParse(raw || {});
    if (parsed.success) {
      const data: any = parsed.data as any;
      if (typeof raw === 'object' && raw !== null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const r = raw as any;
        if (r.createdAt !== undefined) data.createdAt = r.createdAt;
        if (r.updatedAt !== undefined) data.updatedAt = r.updatedAt;
      }
      return data;
    }
  } catch (e) {
    // fallthrough
  }
  return null;
}
