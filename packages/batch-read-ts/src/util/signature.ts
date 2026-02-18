import {
  type Hex,
  type Address,
  keccak256,
  encodePacked,
  hexToSignature,
  http,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  createShieldedWalletClient,
  sanvil,
  seismicTestnetGcp1,
} from "seismic-viem";

export async function createClient(privateKey: Hex, mode: string) {
  const chain = mode === "local" ? sanvil : seismicTestnetGcp1;
  const account = privateKeyToAccount(privateKey);

  const client = await createShieldedWalletClient({
    chain,
    account,
    transport: http(),
  });

  return { client, account, chain };
}

export async function signBalanceRead(
  privateKey: Hex,
  owner: Address,
  expiry: bigint,
): Promise<Hex> {
  const account = privateKeyToAccount(privateKey);

  const messageHash = keccak256(
    encodePacked(
      ["string", "address", "uint256"],
      ["SRC20_BALANCE_READ", owner, expiry],
    ),
  );

  const ethSignedHash = keccak256(
    encodePacked(
      ["string", "bytes32"],
      ["\x19Ethereum Signed Message:\n32", messageHash],
    ),
  );

  const signature = await account.sign({ hash: ethSignedHash });

  const r = signature.slice(0, 66) as Hex; // First 32 bytes
  const s = ("0x" + signature.slice(66, 130)) as Hex; // Next 32 bytes
  const v = parseInt(signature.slice(130, 132), 16); // Last byte

  return encodePacked(["bytes32", "bytes32", "uint8"], [r, s, v]);
}

export function createExpiry(hoursFromNow: number = 1): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + hoursFromNow * 3600);
}
