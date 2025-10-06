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
} {
  const nonce = encryptedData.slice(-NONCE_LENGTH);
  const ciphertext = encryptedData.slice(0, -NONCE_LENGTH);

  return { ciphertext, nonce };
}

export async function attachEventListener(client: ShieldedWalletClient, aesKey: Buffer) {
  const keyHash = keccak256(aesKey) as `0x${string}`;

  const transferEvent = SRC20Abi.find(
    (item: any) => item.type === 'event' && item.name === 'Transfer'
  ) as AbiEvent;
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: transferEvent,
    args: {
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesKey, log, logTransfer);
      });
    },
  });

  const approvalEvent = SRC20Abi.find(
    (item: any) => item.type === 'event' && item.name === 'Approval'
  ) as AbiEvent;
  client.watchEvent({
    address: DeployOut.MockSRC20 as `0x${string}`,
    event: approvalEvent,
    args: {
      encryptKeyHash: keyHash,
    },
    onLogs: (logs: any[]) => {
      logs.forEach(async (log) => {
        handleEvent(aesKey, log, logApproval);
      });
    },
  });
}

async function handleEvent(aesKey: Buffer, log: any, callback: (data: any) => void) {
  const { encryptedAmount } = log.args;
  const encryptedAmountBuffer = Buffer.from(encryptedAmount.slice(2), 'hex');
  const { ciphertext, nonce } = parseEncryptedData(encryptedAmountBuffer);
  const amountBytes = decrypt(aesKey, nonce, ciphertext);
  const amount = BigInt(`0x${amountBytes.toString('hex')}`);
  
  callback({...log.args, amount});
}

function logTransfer(data: any) {
  const { from, to, amount } = data;

  console.log('Transfer(address from, address to, bytes encryptedAmount)\n');
  console.log('    from:', from);
  console.log('    to:', to);
  console.log('    amount:', amount, '\n');
}

function logApproval(data: any) {
  const { owner, spender, amount } = data;

  console.log('Approval(address owner, address spender, bytes encryptedAmount)\n');
  console.log('    owner:', owner);
  console.log('    spender:', spender);
  console.log('    amount:', amount, '\n');
}
