import { hash, verify } from "@node-rs/argon2";

/**
 * argon2id with library defaults, which are already at the OWASP-recommended
 * floor. Hashing is deliberately slow (~50-100ms) — that cost is the whole
 * point, since it is what makes offline brute-forcing a stolen dump expensive.
 */
export function hashPassword(plain: string): Promise<string> {
  return hash(plain);
}

export async function verifyPassword(passwordHash: string, plain: string): Promise<boolean> {
  try {
    return await verify(passwordHash, plain);
  } catch {
    // A malformed or truncated hash in the database must read as "wrong
    // password", never as a 500 that tells an attacker the row exists.
    return false;
  }
}
