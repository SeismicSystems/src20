import { createDecipheriv } from 'crypto';

import { keccak256 } from 'ethers';
import { http, type AbiEvent, type Chain } from 'viem';
import type { Account } from 'viem/accounts';
import {
  createShieldedWalletClient,
  getShieldedContract,
  type ShieldedWalletClient,
} from 'seismic-viem';

import { IntelligenceAbi, SRC20Abi } from './util/abi';
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
  // const transferEvent = SRC20Abi.find(
  //   (item: any) => item.type === 'event' && item.name === 'Transfer'
  // ) as AbiEvent;

  // client.watchEvent({
  //   address: DeployOut.MockSRC20 as `0x${string}`,
  //   events: [transferEvent],
  //   onLogs: (logs: any[]) => {
  //     logs.forEach(async (log) => {
  //       logTransfer(aesKey, log);
  //     });
  //   },
  // });

  const aesKeyBigInt = BigInt('0x' + aesKey.toString('hex'))
  const contract = getShieldedContract({
    abi: IntelligenceAbi,
    address: DeployOut.Intelligence as `0x${string}`,
    client,
  });
  // const msg = "0x" + Buffer.from([1]).toString('hex');
  // const encryptedData = await contract.write.encrypt(["0x01"]);
  // console.log("encryptedData", encryptedData);
  // console.log("address", DeployOut.Intelligence);

  // console.log('ABI being used:', IntelligenceAbi);
  // console.log('Contract address:', contract.address);
  // console.log('Expected Intelligence address:', DeployOut.Intelligence);

  // console.log('Contract methods:', Object.keys(contract));
  
  const encryptedData = await contract.write.encryptIdx([0, "0x01"]);
  console.log("encryptedData", encryptedData);

  // const message = await contract.read.decrypt([aesKeyBigInt, encryptedData]);
  // console.log(message);
}

export function decrypt(key: Buffer, nonce: Buffer, ciphertext: Buffer): string {
  // AES precompile uses aes_gcm Rust library, which automatically appends tag
  // to ciphertext
  const ciphertextNoTag = ciphertext.slice(0, -TAG_LENGTH);
  const tag = ciphertext.slice(-TAG_LENGTH);

  const decipher = createDecipheriv(AES256GCM_LABEL, key, nonce);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(ciphertextNoTag, undefined, 'utf8');
  decrypted += decipher.final('utf8');
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
  // const { to, encryptedAmount } = log.args;
  const encryptedAmount = "0x072a79329a14584fa48cb4a8f9d2e343bfc18e0a9964e81f2ca0a5da0e3f814fe8f65061a57f7dd8537902e643a64d0200000000000000000000003cf401dcfbfc5719ee4d26258f02f637d30fc1860ab52bc241c3495d2c7e11a790";
  const encryptedAmountBuffer = Buffer.from(encryptedAmount.slice(2), 'hex');

  const localKeyHash = keccak256(aesKey);
  const { ciphertext, nonce, keyHash } = parseEncryptedData(encryptedAmountBuffer);
  const message = decrypt(aesKey, nonce, ciphertext);
  const amount = BigInt("0x" + Buffer.from(message, 'utf8').toString('hex'));
  console.log("HERE");
  console.log("0x" + ciphertext.toString('hex'));
  console.log("0x" + nonce.toString('hex'));
  console.log("0x" + keyHash.toString('hex'));
  console.log(amount);
}
