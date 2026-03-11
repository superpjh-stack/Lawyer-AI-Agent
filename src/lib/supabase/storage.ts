// LexAgent - Supabase Storage Client (server-side)
// Uses service role key for direct bucket access

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const DOCUMENTS_BUCKET = 'documents';
export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function getStorageClient() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Supabase Storage 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 확인하세요.');
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

export interface UploadResult {
  path: string;
  publicUrl: string;
}

/**
 * Upload a file buffer to Supabase Storage.
 * Path: {userId}/{documentId}/{fileName}
 */
export async function uploadToStorage(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  userId: string,
  documentId: string
): Promise<UploadResult> {
  const client = getStorageClient();
  const path = `${userId}/${documentId}/${fileName}`;

  const { data, error } = await client.storage
    .from(DOCUMENTS_BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    throw new Error(`Storage 업로드 실패: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(data.path);

  return {
    path: data.path,
    publicUrl: urlData.publicUrl,
  };
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFromStorage(path: string): Promise<void> {
  const client = getStorageClient();
  const { error } = await client.storage.from(DOCUMENTS_BUCKET).remove([path]);
  if (error) {
    console.error('[storage] Delete failed:', error.message);
  }
}

/**
 * Check if Supabase Storage is configured.
 */
export function isStorageConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
