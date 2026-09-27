# StandWord testing record

## Automated release checks

Run from the repository root:

```bash
pnpm test
pnpm lint
pnpm build
```

The critical project check verifies:

- frontend contract address equals `0xA701A047BE663dA232A068A1029E48f98c7bE521`;
- deployment transaction is recorded;
- `contract/PriorWordBind.py` matches SHA-256 `0695bb114b13f9921ee39db7a5afdf6d36e367339b258a257d404afaddbcd024`;
- all four write methods and required ledger reads are wired;
- the old Intelligent Contract address is absent from the runtime frontend.

## Verified live run

The complete flow was executed with separate author and relier wallets on StudioNet.

- Position ID: `d638454dc549b73e59171d2b23e85069dd4c2c1f5262997c2cfc44d57174d348`
- Topic: `Release audit coverage — 2026-09-27 test 01`
- Original position: `We will publish the audit report for every release.`
- Reliance label: `Release compliance reviewer`
- Narrowing follow-up: `We will publish a public audit report only for major software releases.`

| Step | Final state | Evidence |
| --- | --- | --- |
| Open position | `FINALIZED`, `STANDING` | `docs/evidence/01-open-position-finalized.png` |
| Register reliance | `FINALIZED`, active | `docs/evidence/02-reliance-active.png` |
| Submit follow-up | `FINALIZED`, `WALKED_BACK` | `docs/evidence/03-followup-walked-back.png` |
| Withdraw reliance | `FINALIZED`, withdrawn | `docs/evidence/04-reliance-withdrawn.png` |
| Explorer verification | `SUCCESS`, `Accepted`, `Finalized` | `docs/evidence/05-withdraw-explorer-finalized.png` |

The finalized reads reflected each write. The deployed frontend is recorded in `docs/evidence/06-live-project.png`.

## Reproduction notes

Use two funded StudioNet wallets. A topic is unique per author, so change the topic before opening another position with the same wallet. Register reliance before submitting a narrowing follow-up; new reliance cannot be registered after the position becomes `WALKED_BACK`.
