import type { ShieldedWalletClient } from "seismic-viem";

export async function waitForTx(
    txPromise: Promise<`0x${string}`>,
    client: ShieldedWalletClient,
) {
    const hash = await txPromise;
    return await client.waitForTransactionReceipt({ hash });
}
