import { createDecipheriv } from 'crypto';

import { keccak256 } from 'ethers';
import { http, type AbiEvent, type Chain } from 'viem';
import type { Account } from 'viem/accounts';
import {
  createShieldedWalletClient,
  getShieldedContract,
  type ShieldedWalletClient,
} from 'seismic-viem';

import { SRC20Abi } from './util/abi';
import DeployOut from '../../contracts/out/deploy.json';
import { AES256GCM_LABEL, KEY_HASH_LENGTH, NONCE_LENGTH, TAG_LENGTH } from './util/constants';

let client: ShieldedWalletClient;
export async function createInterface(chain: Chain, account: Account) {
  client = await createShieldedWalletClient({
    chain,
    account,
    transport: http(),
  });
  const contract = getShieldedContract({
    abi: SRC20Abi,
    address: DeployOut.MockSRC20 as `0x${string}`,
    client,
  });
  return { client, contract };
}

export async function attachTransferListener(client: ShieldedWalletClient, aesKey: Buffer) {
  const transferEvent = SRC20Abi.find(
    (item: any) => item.type === 'event' && item.name === 'Transfer'
  ) as AbiEvent;

  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    events: [transferEvent],
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        logTransfer(aesKey, log);
      });
    },
  });
}

export function decrypt(key: Buffer, nonce: Buffer, ciphertext: Buffer): Buffer {
  const ciphertextNoTag = ciphertext.slice(0, -TAG_LENGTH);
  const tag = ciphertext.slice(-TAG_LENGTH);

  const decipher = createDecipheriv(AES256GCM_LABEL, key, nonce);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ciphertextNoTag), decipher.final()]);

  return decrypted;
}

export function parseEncryptedData(encryptedData: Buffer): {
  ciphertext: Buffer;
  nonce: Buffer;
  keyHash: Buffer;
} {
  const keyHash = encryptedData.slice(-KEY_HASH_LENGTH);
  const nonce = encryptedData.slice(-KEY_HASH_LENGTH - NONCE_LENGTH, -KEY_HASH_LENGTH);
  const ciphertext = encryptedData.slice(0, -KEY_HASH_LENGTH - NONCE_LENGTH);

  return { ciphertext, nonce, keyHash };
}

async function logTransfer(aesKey: Buffer, log: any) {
  const { from, to, encryptedAmount } = log.args;
  const encryptedAmountBuffer = Buffer.from(encryptedAmount.slice(2), 'hex');
  const { ciphertext, nonce, keyHash } = parseEncryptedData(encryptedAmountBuffer);

  const localKeyHash = keccak256(aesKey);
  if (localKeyHash === `0x${keyHash.toString('hex')}`) {
    const message = decrypt(aesKey, nonce, ciphertext);
    const amount = BigInt(`0x${message.toString('hex')}`);

    console.log('Transfer(address from, address to, bytes encryptedAmount)\n');
    console.log('    from:', from);
    console.log('    to:', to);
    console.log('    amount:', amount, "\n");
  }
}
