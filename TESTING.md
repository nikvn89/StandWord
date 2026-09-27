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

## Important live checks

Use two funded StudioNet wallets. Do not reuse a topic with the same author because the position ID is author-and-topic scoped.

1. **Author:** connect, open a new position, approve the wallet request, wait for `FINALIZED`, and copy the predicted position ID.
2. **Reader:** paste the position ID and confirm the exact topic, text, author and `STANDING` state load from finalized state.
3. **Relier:** switch wallet, load the same ID, register reliance, and confirm the wallet appears as `ACTIVE`.
4. **Author:** switch back, submit one later statement, wait for the consensus verdict, and confirm it appears in follow-up history.
5. **Walkback path:** only if the verdict is `NARROWS_PRIOR`, confirm the state becomes `WALKED_BACK`; switch to the relying wallet and verify withdrawal becomes available.

Keep the transaction hashes and screenshots from these flows as submission evidence. Never claim a live step passed unless its transaction reached `FINALIZED` and the finalized read reflected the change.
