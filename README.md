# ABN Invoice Verifier

Automated verification of supplier details on invoices, using the
Australian Business Register (ABR) ABN Lookup web services.

## Why I built this
While working in support at CampaignAgent — a pay-later provider for
property vendors — part of my job was manually verifying supplier
invoices during loan approvals. This tool is intended to automate those checks.

## What it does
- Validates an ABN's format locally using the official checksum

## Tech
TypeScript, Node 24 (native type stripping, no build step).

## Getting started
Prerequisites: Node 24+
1. `git clone …` and `npm install`
2. Copy `.env.example` to `.env` and add your ABR GUID
3. `npm test` — run the test suite
4. `npm run dev` — start the app

## Note on data
Uses synthetic invoice data only; ABNs are validated against real,
public ABR records. No real customer data is used.
