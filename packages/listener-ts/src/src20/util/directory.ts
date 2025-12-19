/**
 * Re-export Directory contract helpers from seismic-viem.
 *
 * These functions interact with the Directory system contract at
 * 0x1000000000000000000000000000000000000004 which maps addresses
 * to their AES encryption keys.
 */
export {
  checkRegistration,
  getKeyHash,
  getKey,
  registerKey,
  computeKeyHash,
  DIRECTORY_ADDRESS,
  DirectoryAbi,
} from "seismic-viem";
