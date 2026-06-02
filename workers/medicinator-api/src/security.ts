export async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function createInviteCode() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((byte) => byte.toString(36).padStart(2, "0"))
    .join("")
    .slice(0, 24)
    .toUpperCase();
}
