# StandWord submission draft

## Title

StandWord — On-chain Positions with Accountable Walkbacks

## Note (under 1,000 characters)

StandWord turns public commitments into auditable on-chain records with consequences. An author opens an immutable position; other wallets can register that they rely on it. When the author later makes a new statement, GenLayer validators apply a narrow semantic test: does the later statement cover fewer occasions than the original? A narrowing verdict permanently marks the position WALKED_BACK, closes further follow-ups, and unlocks a one-time withdrawal path for each active relier. The Project frontend derives author-scoped position IDs, reads finalized state, exposes follow-up and reliance ledgers, and requires explicit wallet confirmation for every write. The deployed Project preserves the exact reviewed PriorWordBind source and adds a purpose-built interface, deterministic integrity checks, responsive UI, and reproducible build documentation.

## Evidence links

- Contract: https://explorer-studio.genlayer.com/address/0xA701A047BE663dA232A068A1029E48f98c7bE521
- Deploy transaction: https://explorer-studio.genlayer.com/tx/0xc661ae5362281cf4bd6e1a0eb24f64e64b140828e37f80a18b31a71c88fc1391
- GitHub: `[ADD NEW GITHUB REPOSITORY URL]`
- Live Project: `[ADD DEPLOYED FRONTEND URL]`

Replace the two bracketed placeholders after the new repository and frontend deployment are available.
