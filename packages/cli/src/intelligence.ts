import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  createHash,
} from "crypto";
import { keccak256 } from "ethers";

const AES256GCM_LABEL = "aes-256-gcm";
const KEY_HASH_LENGTH = 32;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

const KEY = Buffer.from(
  "576021549572ad941e7b0a7bd51048be97edf7f97c6e01300e19b3b9d8b1a457",
  "hex",
);
const ENCRYPTED_DATA = Buffer.from(
  "cf5e6580c15b7c4e110fdb96b9ee2482d034435c1620c704db8d73000000000000000000000000f4d06ef7a25ae7507a3a0ef98e124c4c13dee1336ca1a6c3da9045c5846aa666",
  "hex",
);

export function decrypt(
  key: Buffer,
  nonce: Buffer,
  ciphertext: Buffer,
): string {
  // AES precompile uses aes_gcm Rust library, which automatically appends tag
  // to ciphertext
  const ciphertextNoTag = ciphertext.slice(0, -TAG_LENGTH);
  const tag = ciphertext.slice(-TAG_LENGTH);

  const decipher = createDecipheriv(AES256GCM_LABEL, key, nonce);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextNoTag, undefined, "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function parseEncryptedData(encryptedData: Buffer): {
  ciphertext: Buffer;
  nonce: Buffer;
  keyHash: Buffer;
} {
  const keyHash = encryptedData.slice(-KEY_HASH_LENGTH);
  const nonce = encryptedData.slice(
    -KEY_HASH_LENGTH - NONCE_LENGTH,
    -KEY_HASH_LENGTH,
  );
  const ciphertext = encryptedData.slice(0, -KEY_HASH_LENGTH - NONCE_LENGTH);
  return { ciphertext, nonce, keyHash };
}

const localKeyHash = keccak256(KEY);
const { ciphertext, nonce, keyHash } = parseEncryptedData(ENCRYPTED_DATA);
console.log(
  "keyHash match?",
  keyHash.toString("hex") === localKeyHash.slice(2), // Remove 0x prefix
);
console.log(decrypt(KEY, nonce, ciphertext));
