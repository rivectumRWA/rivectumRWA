<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/rivectumRWA/INFRA/master/image.png">
    <img alt="RivectumRWA" src="https://raw.githubusercontent.com/rivectumRWA/INFRA/master/image.png" width="600">
  </picture>
</p>

<p align="center">
  <strong>Autonomous Real-World Asset Allocation on Base</strong>
</p>

<p align="center">
  <a href="https://rivectum.xyz"><img src="https://img.shields.io/badge/Website-rivectum.xyz-6366f1?style=for-the-badge&logo=safari&logoColor=white" alt="Website"></a>
  <a href="https://app.rivectum.xyz"><img src="https://img.shields.io/badge/dApp-app.rivectum.xyz-10b981?style=for-the-badge&logo=vercel&logoColor=white" alt="dApp"></a>
  <a href="https://x.com/rivectum"><img src="https://img.shields.io/badge/X-@rivectum-000000?style=for-the-badge&logo=x&logoColor=white" alt="X"></a>
</p>

---

### 🔭 What is RivectumRWA?

RivectumRWA is an **autonomous allocation protocol** that rebalances tokenized US Treasuries & ETH on **Base Sepolia** using ERC-4626 vaults and an on-chain agent. Think: automated yield strategy that runs itself.

### ⚙️ How It Works

```
User deposits USDC ──► ERC-4626 Vault ──► 60% US Treasuries (RWA)
                                        └─► 40% ETH (Crypto)
                                        
Agent cron loop ──► checks TVL every 6h ──► rebalances if drift > 5%
                                        └─► logs decisions to SQLite
```

### 🧱 Architecture

| Layer | Stack |
|-------|-------|
| Smart Contracts | Solidity 0.8.24 · Foundry · OpenZeppelin ERC-4626 · Solady |
| Agent | Bun + TypeScript · viem · Drizzle + SQLite |
| Dashboard | Next.js 15 · Reown AppKit 1.7.19 · wagmi · Tailwind CSS 4 |
| CLI | Bun + TypeScript · agent/user namespaces |
| Infra | PM2 · Nginx · VPS (109.199.103.135) |

### 📂 Repositories

<table>
  <tr>
    <td width="50%">
      <a href="https://github.com/rivectumRWA/project">
        <strong>📦 project</strong>
      </a><br>
      Monorepo — smart contracts, agent, web dashboard, CLI
    </td>
    <td width="50%">
      <a href="https://github.com/rivectumRWA/INFRA">
        <strong>🏗️ INFRA</strong>
      </a><br>
      Architecture docs, UI overview, backend specs, environment reference
    </td>
  </tr>
  <tr>
    <td width="50%">
      <a href="https://github.com/rivectumRWA/docs">
        <strong>📖 Docs</strong>
      </a><br>
      User guides, security overview, tutorials — written for everyone
    </td>
    <td></td>
  </tr>
</table>

### 🧪 Status

| Component | Status |
|-----------|--------|
| Vault.sol (ERC-4626) | ✅ 10 tests passing |
| Reown AppKit auth | ✅ Integrated |
| VPS + PM2 + Nginx | ✅ Deployed |
| Agent rebalance loop | ✅ Running |
| Base Sepolia contracts | 🚧 Deploy pending |
| Demo mode | 🚧 `NEXT_PUBLIC_DEMO=true` |

### 🤝 Contributing

Internal project — reach out via [X](https://x.com/rivectum) or open an issue.

---

<p align="center">
  <sub>Built on Base Sepolia ☁️</sub>
</p>
