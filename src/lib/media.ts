export function joinMedia(base: string | undefined, file: string): string {
  if (!base) throw new Error('PUBLIC_MEDIA_BASE is not set');
  return `${base.replace(/\/+$/, '')}/${file}`;
}

export const mediaUrl = (file: string): string => joinMedia(import.meta.env.PUBLIC_MEDIA_BASE, file);
