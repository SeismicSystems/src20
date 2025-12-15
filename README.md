# SRC20
An ERC20 variant with private balances and transfer amounts.

> Note: We're adding SRC20 to Viem mid Dec 2025, so the Typescript clients will be considerably simpler.

## Directory Overview

``` bash
packages/
├── contracts/      # Solidity contracts
├── listener-go/    # Listens to transfer() events in Go
├── listener-ts/    # Listens to transfer() events in Typescript
└── sender-ts/      # Sends transfers in Typescript
```

## Prerequisites 
You need our version of `foundry` (`sfoundry`) to run `contracts/`, `listener-ts`, and `sender-ts`. See [here](https://docs.seismic.systems/getting-started/publish-your-docs) for the installation command.

All packages read from a `.env` file in `packages/contracts/`. See [`packages/contracts/.env.example`](packages/contracts/.env.example) for the required variables.

**Note on `RECIPIENT_AES_KEY`:** The sender cycles transfers between Alice, Bob, and Charlie. The listener uses `ALICE_PRIVATE_KEY`, so `RECIPIENT_AES_KEY` must be Alice's registered AES key. If the key isn't registered, you'll see `<recipient has no key>` instead of decrypted amounts.

## Contract Deployment

The following command deploys a fresh SRC20 contract and logs the resulting contract address in `packages/contracts/out/deploy.json`. 

``` bash
cd packages/contracts
bash script/deploy.sh
```

The other three packages use `deploy.json` to point to the current SRC20 contract. Note that running the deploy script again overwrites the old address.

## Sending Transfers

The following command continuously sends SRC20 tokens (the latest deployment) between a set of three EOAs. 

``` bash
cd packages/sender-ts
bun install
bun dev
```

## Listening for Events

The TypeScript listener supports two modes:

### Recipient Mode

Listen for events where you are the recipient (transfers TO you, approvals FOR you as spender).

```bash
cd packages/listener-ts
bun install
bun dev -- --recipient
```

- Checks if your address is registered in the Directory
- If not registered, prompts to register your `RECIPIENT_AES_KEY`
- Once registered, decrypts transfer amounts sent to you and approval amounts approved for you
- If `RECIPIENT_AES_KEY` is not set, the listener will exit with an error

### Intelligence Provider Mode

Listen for all events encrypted to the intelligence provider's key.

```bash
bun dev -- --intelligence
```

- Requires `INTELLIGENCE_AES_KEY` in `.env`
- Decrypts all transfer amounts across all users. Only decrypts transfer amounts, not approval amounts as in recipient mode.

### Daemon Mode

For running without interactive prompts (e.g., with supervisor):

```bash
bun dev -- --recipient --no-prompt
```

### Go Client

To listen with a Go client:

``` bash
cd packages/listener-go
go run ./
```

Here's the expected output:

![listening-output](assets/listening-output.png)

