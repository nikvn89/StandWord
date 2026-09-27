# StandWord

StandWord is a GenLayer Project interface for the deployed `PriorWordBind` Intelligent Contract. It lets an author publish an immutable position, lets other wallets register reliance, and asks GenLayer consensus whether a later statement narrows the position's original scope. A narrowing verdict permanently marks the position as `WALKED_BACK` and unlocks reliance withdrawal.

## Verified deployment

- Network: GenLayer StudioNet, chain ID `61999`
- Project contract: `0xA701A047BE663dA232A068A1029E48f98c7bE521`
- Deploy transaction: `0xc661ae5362281cf4bd6e1a0eb24f64e64b140828e37f80a18b31a71c88fc1391`
- Explorer: https://explorer-studio.genlayer.com/address/0xA701A047BE663dA232A068A1029E48f98c7bE521
- Frozen contract source SHA-256: `0695bb114b13f9921ee39db7a5afdf6d36e367339b258a257d404afaddbcd024`

The exact deployed source is preserved at `contract/PriorWordBind.py`. The older Intelligent Contract address is intentionally not used by this Project frontend.

## Main flows

1. Connect an EVM-compatible wallet and switch to StudioNet.
2. Open a position with a topic and position text.
3. Copy or load the generated 64-character position ID.
4. From another wallet, register reliance on a standing position.
5. From the author wallet, submit a later statement for semantic classification.
6. Inspect the finalized follow-up verdict and reliance ledger.
7. If the position becomes `WALKED_BACK`, the relying wallet may withdraw its reliance.

The frontend only stages WebMCP inputs; it never submits a transaction without an explicit wallet confirmation.

## Run locally

Requirements: Node.js 20+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000` and connect MetaMask.

## Verification

```bash
pnpm test
pnpm lint
pnpm build
```

`pnpm test` checks the deployed address, deploy transaction, exact contract-source hash, required read/write methods, and exclusion of the old address. See `TESTING.md` for the release record and live wallet checklist.

## Stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- `genlayer-js` for contract reads and writes
- `viem` for deterministic position-ID derivation

No private key or wallet secret is stored in the project.
