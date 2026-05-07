import { randomBytes } from "crypto";
import { brand } from "@/config/brand";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function genInviteCode(): string {
  const bytes = randomBytes(8);
  let suffix = "";
  for (const byte of bytes) {
    suffix += CHARS[byte % CHARS.length];
  }
  return `${brand.inviteCodePrefix}-${suffix}`;
}
