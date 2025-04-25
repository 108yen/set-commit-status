# 108yen/set-commit-status

This action allows you to set the commit status on github.

## Usage

### Inputs

- `status`: The status to be set for commit. ("error", "failure", "pending", "success")
- `sha`: Commit hash for which the status is to be set.
- `context`: Context of status. (optional)
- `description`: Description of status. (optional)

### Example

> [!IMPORTANT]
> This action need `statuses: write` permission.

This is an example of a test workflow that triggered vercel preview build event.
As shown in the [official example](https://vercel.com/guides/how-can-i-run-end-to-end-tests-after-my-vercel-preview-deployment), this is useful when the vercel deployment triggers a playwright test.

```yml
name: Playwright Tests

on:
  repository_dispatch:
    types:
      - "vercel.deployment.success"

permissions: {}

defaults:
  run:
    shell: bash

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  playwright:
    name: E2E Test

    if: github.event_name == 'repository_dispatch'

    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: read
      statuses: write

    steps:
      - name: Set pending status
        uses: 108yen/set-commit-status@v1
        with:
          status: pending
          description: Test in progress
          sha: ${{ github.event.client_payload.git.sha }}

      - name: Checkout
        uses: actions/checkout@v4
        with:
          ref: ${{ github.event.client_payload.git.sha }}

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Run test
        run: npx playwright test
        env:
          BASE_URL: ${{ github.event.client_payload.url }}

      - name: Upload report
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - name: Set success status
        if: success()
        uses: 108yen/set-commit-status@v1
        with:
          status: success
          description: Test successful
          sha: ${{ github.event.client_payload.git.sha }}

      - name: Set failure status
        if: failure()
        uses: 108yen/set-commit-status@v1
        with:
          status: failure
          description: Test failure
          sha: ${{ github.event.client_payload.git.sha }}
```
