import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '@/shared/lib/firebase';

export async function uploadPublic(folder: string, file: File, onProgress?: (pct: number) => void) {
  const path = `public/${folder}/${Date.now()}-${file.name.replace(/[^\w.]/g, '_')}`;
  const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type, cacheControl: 'public, max-age=31536000' });
  await new Promise<void>((resolve, reject) => {
    task.on('state_changed', (s) => onProgress?.(Math.round((s.bytesTransferred / s.totalBytes) * 100)), reject, () => resolve());
  });
  return { path, url: await getDownloadURL(task.snapshot.ref) };
}

export function imageSize(file: File) {
  return new Promise<{ width: number; height: number }>((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => resolve({ width: 0, height: 0 });
    img.src = URL.createObjectURL(file);
  });
}
