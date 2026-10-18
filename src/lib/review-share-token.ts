import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

/** Opaque authenticated encryption. A changed token must never select another record. */
export function encryptReviewShare(recordId: string, key: string) {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(key, "base64url"), iv)
  const body = Buffer.concat([cipher.update(JSON.stringify({ recordId }), "utf8"), cipher.final()])
  return `s1.${Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url")}`
}
export function decryptReviewShare(token: string, key: string): string | null {
  try {
    if (!/^s1\.[A-Za-z0-9_-]{40,1500}$/.test(token)) return null
    const bytes = Buffer.from(token.slice(3), "base64url")
    const decipher = createDecipheriv("aes-256-gcm", Buffer.from(key, "base64url"), bytes.subarray(0,12))
    decipher.setAuthTag(bytes.subarray(12,28))
    const value = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString("utf8"))
    return typeof value.recordId === "string" && value.recordId.length > 0 ? value.recordId : null
  } catch { return null }
}

export const createReviewShareSecrets = () => ({ key: randomBytes(32).toString("base64url"), links: {} as Record<string,string> })
