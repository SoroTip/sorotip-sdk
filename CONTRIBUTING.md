# Contributing to @sorotip/sdk

This repo participates in the [Stellar Wave Program on Drips](https://drips.network/wave).
Contributors earn USDC rewards for merged pull requests that resolve an assigned issue.

## How to contribute

1. Browse open issues on this repo and comment to express interest.
2. **Do NOT start coding until you have been assigned** by the maintainer.
3. Once assigned, fork the repo and create a branch named:
   - `feat/N-short-description` for new features
   - `fix/N-short-description` for bug fixes

   where `N` is the issue number, e.g. `feat/8-add-usewallet-network-guard`.
4. Write your code and tests. Make sure the following all pass locally:
   - `npm run typecheck`
   - `npm run build`
   - `npm test`
5. Open a pull request that references the issue number (e.g. `Closes #8`) and
   fill out the PR template completely.
6. Wait for review. Address any requested changes. Once merged and the issue is
   marked resolved, your reward is processed through Drips.

## Code standards

- TypeScript strict mode, zero `any` types.
- Every exported function, class, and type gets a JSDoc comment.
- No stub functions, TODO comments, or placeholder logic — every PR should ship
  a complete, working implementation of what its issue describes.
- Add or update tests in `test/` for any behavioral change to `src/utils.ts`
  or type definitions.

## About Drips Wave

Drips Wave is a weekly open-source contributor bounty program run by the
Stellar Development Foundation. Issues are labeled by complexity
(`complexity: trivial`, `complexity: medium`, `complexity: high`) and convert
to USDC rewards when your merged PR resolves them.

Learn more: https://drips.network/wave
