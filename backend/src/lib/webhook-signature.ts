import { createHmac, timingSafeEqual } from "node:crypto";
export function verifyWebhookSignature(raw: Buffer, signature: unknown, secret: string): boolean {
  if (!secret || typeof signature !== "string" || !/^sha256=[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(raw).digest(), Buffer.from(signature.slice(7), "hex"));
}
