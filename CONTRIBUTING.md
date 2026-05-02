# Contributing to FoodTrace GH

Thanks for helping build FoodTrace GH.

## Branch naming

- `feature/step-X-description`
- `fix/issue-description`
- `docs/short-description`

## Pull requests

- Keep pull requests focused on one step or one fix.
- Explain what changed and how it was tested.
- Do not mix unrelated refactors into deployment or release changes.

## Local workflow

1. Install dependencies with `npm install --legacy-peer-deps`.
2. Run database migrations with `npm run db:migrate`.
3. Seed development data with `npm run db:seed`.
4. Start backend and web locally for review.
5. Run typechecks before opening a PR.

## Review expectations

- Keep the food and drug domains separate.
- Preserve role-based access control.
- Keep user-facing copy simple and trustworthy.
- Prefer small, testable changes.

