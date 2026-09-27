# StandWord project submission

## Title

StandWord — On-chain Positions with Accountable Walkbacks

## Note (under 1,000 characters)

StandWord turns public commitments into auditable on-chain records with consequences. An author opens an immutable position; other wallets can register that they rely on it. When the author later makes a new statement, GenLayer validators apply a narrow semantic test: does the later statement cover fewer occasions than the original? A narrowing verdict permanently marks the position WALKED_BACK, closes further follow-ups, and unlocks a one-time withdrawal path for each active relier. The Project frontend derives author-scoped position IDs, reads finalized state, exposes follow-up and reliance ledgers, and requires explicit wallet confirmation for every write. The deployed Project preserves the exact reviewed PriorWordBind source and adds a purpose-built responsive interface, deterministic integrity checks, reproducible build documentation, and a verified two-wallet end-to-end flow.

## Evidence links

- Contract: https://explorer-studio.genlayer.com/address/0xA701A047BE663dA232A068A1029E48f98c7bE521
- Deploy transaction: https://explorer-studio.genlayer.com/tx/0xc661ae5362281cf4bd6e1a0eb24f64e64b140828e37f80a18b31a71c88fc1391
- GitHub: https://github.com/nikvn89/StandWord
- Live Project: https://stand-word.vercel.app
- Test evidence: https://github.com/nikvn89/StandWord/tree/main/docs/evidence
- Testing record: https://github.com/nikvn89/StandWord/blob/main/TESTING.md

## Verified result

Position `d638454dc549b73e59171d2b23e85069dd4c2c1f5262997c2cfc44d57174d348` completed the full lifecycle: open position, active reliance, `NARROWS_PRIOR` walkback, and successful reliance withdrawal. Every write reached `FINALIZED`; the withdrawal also shows `SUCCESS` in GenLayer Explorer.
