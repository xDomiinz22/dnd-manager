// NO SE USA ACTUALMENTE. El proyecto guarda los assets como bytes en Postgres
// (ver server/controllers/assetController.ts) para evitar depender de disco
// persistente en serverless. Este archivo se conserva tal cual por si más
// adelante hace falta reactivar Vercel Blob (o el fallback local para dev);
// antes de reengancharlo, revisar que `LocalDiskStorageService` no se use en
// producción (no hay filesystem persistente en las funciones de Vercel).
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface UploadTarget {
  key: string;
  uploadUrl: string;
  uploadMethod: "PUT" | "POST";
}

export interface StorageService {
  getUploadTarget(params: { mime: string; name: string; kind: string }): Promise<UploadTarget>;
  /** Confirma que la subida terminó y devuelve la URL pública/servible del asset. */
  finalize(key: string): Promise<{ url: string }>;
  delete(key: string): Promise<void>;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildKey(kind: string, name: string): string {
  return `${kind.toLowerCase()}/${randomUUID()}-${sanitizeFileName(name)}`;
}

/**
 * Almacenamiento local en disco para desarrollo. La "subida directa" se simula
 * con un endpoint propio (PUT /api/assets/local-upload/:key) en vez de una URL
 * prefirmada real, ya que el disco local no tiene ese concepto.
 */
export class LocalDiskStorageService implements StorageService {
  private readonly rootDir: string;

  constructor(rootDir = path.join(process.cwd(), "storage")) {
    this.rootDir = rootDir;
  }

  getRootDir(): string {
    return this.rootDir;
  }

  async getUploadTarget(params: { mime: string; name: string; kind: string }): Promise<UploadTarget> {
    const key = buildKey(params.kind, params.name);
    return {
      key,
      uploadUrl: `/api/assets/local-upload/${encodeURIComponent(key)}`,
      uploadMethod: "PUT",
    };
  }

  async finalize(key: string): Promise<{ url: string }> {
    const filePath = path.join(this.rootDir, key);
    await fs.access(filePath);
    return { url: `/api/assets/local/${key}` };
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.rootDir, key);
    await fs.rm(filePath, { force: true });
  }

  async writeLocalUpload(key: string, data: Buffer): Promise<void> {
    const filePath = path.join(this.rootDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
  }
}

/**
 * Adaptador para Vercel Blob. NO se ha podido probar contra un Blob store real
 * en esta sesión (sin BLOB_READ_WRITE_TOKEN todavía) — verificar la firma exacta
 * de `generateClientTokenFromReadWriteToken` contra la doc vigente de
 * `@vercel/blob/client` antes de confiar en esto en la Fase 8.
 */
export class VercelBlobStorageService implements StorageService {
  async getUploadTarget(params: { mime: string; name: string; kind: string }): Promise<UploadTarget> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) throw new Error("Missing BLOB_READ_WRITE_TOKEN");

    const { generateClientTokenFromReadWriteToken } = await import("@vercel/blob/client");
    const key = buildKey(params.kind, params.name);
    const clientToken = await generateClientTokenFromReadWriteToken({
      token,
      pathname: key,
      onUploadCompleted: undefined,
    });

    return {
      key,
      uploadUrl: `https://blob.vercel-storage.com/${key}?clientToken=${clientToken}`,
      uploadMethod: "PUT",
    };
  }

  async finalize(key: string): Promise<{ url: string }> {
    const { head } = await import("@vercel/blob");
    const blob = await head(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
    return { url: blob.url };
  }

  async delete(key: string): Promise<void> {
    const { del } = await import("@vercel/blob");
    await del(key, { token: process.env.BLOB_READ_WRITE_TOKEN });
  }
}

export function createStorageService(): StorageService {
  return process.env.BLOB_READ_WRITE_TOKEN ? new VercelBlobStorageService() : new LocalDiskStorageService();
}
