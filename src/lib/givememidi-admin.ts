export const GIVEMEMIDI_ADMIN_EMAIL = "nightmareasian@gmail.com";

export function isGiveMeMidiAdmin(email?: string | null) {
  return Boolean(email && email.trim().toLowerCase() === GIVEMEMIDI_ADMIN_EMAIL);
}