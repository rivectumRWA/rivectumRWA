# Agent RWA Vault — Hackathon Demo

ERC-4626 USDC vault on Base Sepolia, rebalanced by a TypeScript agent via signed intents.

## Setup

1. `cd contracts && forge install && forge build`
2. `cd agent && bun install && cp .env.example .env && bun run db:migrate`
3. `cd web && pnpm install && cp .env.example .env.local`

(Full instructions appear after deployment.)
