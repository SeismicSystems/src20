# SRC20 Demo

Monorepo demonstrating SRC20 (shielded ERC20) vs standard ERC20. Packages in `packages/`: contracts, sender-ts, listener-ts, batch-read-ts, listener-go.

For detailed architecture, API comparisons (ERC20 vs SRC20), event encryption flow, and client-side usage patterns, see @README.md.

## Build & Run

- Install: `bun install:all` from repo root
- Install Solidity deps: `sforge soldeer install` from `packages/contracts/`
- Build contracts: `sforge build` (NOT `forge`) from `packages/contracts/`
- Test contracts: `sforge test`
- Deploy: `bun run deploy` — writes addresses to `packages/contracts/out/deploy.json`
- All packages read `.env` from `packages/contracts/.env.example`

## Critical Conventions

- SRC20 Solidity uses `suint256` (shielded type), never `uint256` for amounts/balances/allowances
- SRC20 TypeScript uses `seismic-viem`, not `viem`:
  - `createShieldedWalletClient` / `createShieldedPublicClient` (async — key derivation)
  - `getShieldedContract` not `getContract`
  - `signedReadContract` for reading private state (e.g. `balance()`)
- SRC20 has no `balanceOf(address)` — only `balance()` (caller's own, via signed read)
- SRC20 `allowance(spender)` takes one arg (caller-scoped), not `allowance(owner, spender)`
- Events emit `(from, to, encryptKeyHash, encryptedAmount)`, not plaintext amounts

## System Contracts (predeployed, hardcoded addresses)

- Directory: `0x1000000000000000000000000000000000000004` — AES key registry
- Intelligence: `0x1000000000000000000000000000000000000005` — provider management

## Dependencies

- SRC20, SRC20Multicall, and ISRC20 come from `seismic-std-lib` (managed by Soldeer, from `github.com/SeismicSystems/seismic`)
- Import as `import {SRC20} from "seismic-std-lib/SRC20.sol"`
- Git submodules (solmate, forge-std, ds-test) remain for ERC20/test utilities

## Structure

- Each package has parallel `erc20/` and `src20/` dirs — keep them mirrored
- Sender scripts cycle Alice → Bob → Charlie with randomized operations
- Listener has two modes: `--intelligence` (decrypts all) and `--recipient` (decrypts own)
- `--no-prompt` flag for daemon/CI usage
