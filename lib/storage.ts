import { put, del } from "@vercel/blob";
import { randomBytes } from "crypto";

/**
 * Upload a document file to Vercel Blob.
 *
 * Returns the blob URL (public, but obfuscated by random key prefix).
 * The blob URL is stored in Document.fileUrl.
 *
 * Path convention: documents/<random-prefix>/<original-filename>
 * The random prefix prevents URL guessing without the database record.
 */
export async function uploadDocument(
  file: File,
  _uploaderId: string
): Promise<{ url: string; size: number; mimeType: string }> {
  const prefix = randomBytes(16).toString("base64url");
  const path = `documents/${prefix}/${file.name}`;

  const blob = await put(path, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return {
    url: blob.url,
    size: file.size,
    mimeType: file.type || "application/octet-stream",
  };
}

/**
 * Delete a document from Vercel Blob.
 * Called when a Document record is hard-deleted.
 */
export async function deleteDocument(url: string): Promise<void> {
  await del(url);
}
