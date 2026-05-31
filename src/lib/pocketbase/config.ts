export const POCKETBASE_URL =
  process.env.NEXT_PUBLIC_POCKETBASE_URL?.replace(/\/$/, "") ||
  process.env.POCKETBASE_URL?.replace(/\/$/, "") ||
  "https://api-midi.softowetto.com";

export const POCKETBASE_AUTH_COOKIE = "givememidi_pb_auth";

export function getPocketBaseFileUrl(
  collection: string,
  recordId: string,
  fileName?: string | null
) {
  if (!fileName) return null;
  if (/^https?:\/\//i.test(fileName)) return fileName;

  return `${POCKETBASE_URL}/api/files/${collection}/${recordId}/${encodeURIComponent(
    fileName
  )}`;
}
