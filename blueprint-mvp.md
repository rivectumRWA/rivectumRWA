# Blueprint dan MVP — SerraRWA

Tanggal: 2026-05-23  
Status: draft eksekusi untuk demo/internal MVP  
Repo: `D:\Develope\gitrwa\project`

Nama produk: **SerraRWA**  
Subtitle: **Autonomous Allocation for Real-World Assets**  
Tagline: **Agentic vault strategy for tokenized real-world assets.**

## 1. Ringkasan Produk

SerraRWA adalah demo/protokol alokasi RWA berbasis vault ERC-4626 USDC di Base Sepolia yang dikelola oleh off-chain TypeScript agent. User menyetor USDC ke vault, agent membaca sinyal APY dari underlying ERC-4626 yang sudah di-whitelist, memilih alokasi 60/40 dengan batas maksimum 60% per asset, menandatangani intent, lalu mengeksekusi `rebalance` ke smart contract. Web dashboard menampilkan kondisi vault, alokasi, telemetry keputusan agent, strategy signal, dan control plane.

Tujuan MVP: membuktikan loop end-to-end **deposit → agent decision → signed rebalance → on-chain allocation → dashboard telemetry** berjalan aman untuk demo, dapat diverifikasi, dan tidak mengklaim siap untuk dana sungguhan.

## 2. Capability Statement

Operator dan evaluator hackathon dapat menjalankan SerraRWA sebagai satu RWA vault demo yang menerima deposit USDC testnet, membiarkan agent membuat keputusan alokasi lintas underlying vault, melihat hasil rebalance dan telemetry keputusan melalui dashboard, serta mengaudit status kontrak/agent tanpa membaca source code langsung.

## 3. Target Pengguna MVP

1. **Demo user / depositor**
   - Connect wallet di Base Sepolia.
   - Melihat vault, TVL, share price, allocation, dan activity.
   - Deposit/withdraw testnet USDC.

2. **Operator / owner**
   - Deploy vault dan register underlying.
   - Menjalankan off-chain agent.
   - Memantau nonce, agent DID, pause state, dan emergency posture.

3. **Reviewer / judge**
   - Membuka dashboard tanpa wallet.
   - Memahami arsitektur agentic rebalancing.
   - Melihat evidence test/build dan batasan demo.

## 4. MVP Scope

### 4.1 In Scope

- ERC-4626 USDC vault dengan:
  - deposit/withdraw/redeem standar ERC-4626;
  - whitelist underlying ERC-4626;
  - signed rebalance intent dari `agentDid`;
  - nonce/deadline replay protection;
  - cap maksimum 6000 bps per underlying;
  - pause dan emergency withdraw owner controls.
- TypeScript/Bun agent dengan:
  - APY probing dari underlying vault;
  - deterministic allocation strategy 60/40;
  - signing intent;
  - submit transaction;
  - SQLite decision log.
- Next.js dashboard dengan:
  - main dashboard;
  - vault detail;
  - activity telemetry;
  - allocation view;
  - strategy view;
  - settings/control plane;
  - API snapshot, preview, decisions.
- Demo fallback mode saat contract/database belum tersedia.
- Local verification:
  - Foundry tests;
  - Bun tests;
  - Next typecheck/build.

### 4.2 Out of Scope untuk MVP

- Mainnet deployment.
- Real customer deposits.
- Multi-agent competition atau advanced portfolio optimization.
- Permissionless underlying onboarding.
- Formal audit/security certification.
- Production monitoring/SLA.
- KYC/compliance/RWA legal enforcement.
- Complex historical analytics atau accounting-grade reports.

## 5. Feature Inventory Saat Ini

| ID | Feature | Surface | Status | Catatan |
| --- | --- | --- | --- | --- |
| F-001 | Main dashboard | `web/app/page.tsx` | Aktif | Menampilkan vault, agent, registry, owner, ops strip. Masih diberi label demo/unaudited. |
| F-002 | Vault detail | `web/app/vault/page.tsx` | Aktif | Snapshot, breakdown underlying, preview simulator, ABI table. |
| F-003 | Activity telemetry | `web/app/activity/page.tsx` + `web/app/api/decisions/route.ts` | Aktif dengan risiko | Ada mismatch status UI/API vs agent DB. |
| F-004 | Allocation map | `web/app/allocations/page.tsx` | Baru / untracked | Sudah diroute via sidebar/topbar. Perlu commit dan QA browser. |
| F-005 | Strategy signals | `web/app/strategy/page.tsx` | Baru / untracked | Menampilkan APY/performance/strategy cards. |
| F-006 | Control plane/settings | `web/app/settings/page.tsx` | Baru / untracked | Menampilkan contract/owner controls context. |
| F-007 | Vault contract | `contracts/src/Vault.sol` | Aktif dan tested | 10 Foundry tests pass. |
| F-008 | Agent rebalance loop | `agent/src/agent.ts` | Aktif dan tested sebagian | 8 Bun tests pass di strategy/sign/db. Perlu live dry-run/testnet run. |
| F-009 | API vault snapshot | `web/app/api/vault/snapshot/route.ts` | Aktif | Live RPC fallback ke demo jika configured invalid/error dengan `DEMO`. |
| F-010 | API vault preview | `web/app/api/vault/preview/route.ts` | Aktif | Preview deposit/redeem via RPC atau demo fallback. |

## 6. Arsitektur MVP

```text
User Wallet
  |
  | deposit / withdraw USDC
  v
ERC-4626 Vault.sol
  |
  | owner registers underlyings
  | agentDid signs rebalance intent
  v
Approved ERC-4626 Underlyings

Off-chain Bun Agent
  | probes APY / convertToAssets
  | pickAllocation 60/40, max 6000 bps
  | signs intent, submits rebalance
  v
SQLite decisions table

Next.js Web
  | reads vault via viem RPC
  | reads decisions via API
  | displays dashboard, vault, activity, allocation, strategy, settings
```

## 7. Core Invariants

1. Alokasi per underlying tidak boleh melebihi `MAX_BPS_PER_ASSET = 6000`.
2. Total alokasi tidak boleh melebihi `10000` bps.
3. `nextNonce` harus naik setelah rebalance sukses.
4. Signature harus berasal dari `agentDid` aktif.
5. Intent expired harus ditolak.
6. Replay intent harus ditolak.
7. Underlying harus whitelisted sebelum menerima allocation.
8. Pause harus memblokir rebalance.
9. Demo UI harus jelas menyatakan tidak untuk dana sungguhan.
10. Dashboard boleh fallback ke demo data, tetapi source `demo` vs `live` harus terlihat jelas.

## 8. Known Risks / Gap Saat Ini

### R1 — Activity status mismatch

Agent menyimpan status:

- `submitted`
- `confirmed`
- `failed`

Web/API memakai filter/status:

- `success`
- `failed`
- `pending`

Dampak: data live bisa tidak tampil sesuai filter, success rate bisa salah, dan telemetry demo bisa terlihat benar padahal live mapping tidak konsisten.

Keputusan MVP: normalisasi status di API atau UI:

- `confirmed` → `success`
- `submitted` → `pending`
- `failed` → `failed`

### R2 — Web build warnings

Build sukses, tetapi ada warning dari dependency wallet/logging:

- optional `@react-native-async-storage/async-storage` melalui MetaMask SDK;
- optional `pino-pretty` melalui pino;
- critical dependency warning dari `ox/viem` tempo module.

Keputusan MVP: boleh diterima untuk demo jika build tetap hijau, tapi harus dicatat sebagai caveat.

### R3 — Belum ada live testnet proof terbaru

Local test/build pass, tetapi blueprint ini belum membuktikan transaksi live Base Sepolia berjalan pada checkout saat ini.

Keputusan MVP: sebelum demo publik, jalankan live smoke test dengan testnet wallet dan dokumentasikan tx hash.

### R4 — New pages masih untracked

`allocations`, `strategy`, dan `settings` ada di working tree tetapi belum tercatat dalam commit.

Keputusan MVP: sebelum release/demo branch, review visual dan commit secara eksplisit.

## 9. Blueprint Eksekusi

### Phase 0 — Freeze Baseline

Tujuan: pastikan semua orang tahu kondisi awal sebelum lanjut.

Tasks:

1. Simpan audit result ini sebagai baseline.
2. Jalankan:
   - `git status --short --branch`
   - `forge test -vv`
   - `bun test`
   - `pnpm exec tsc --noEmit`
   - `pnpm build`
3. Catat warning build yang masih diterima.

Exit criteria:

- Semua test/build utama pass.
- Dirty/untracked files diketahui dan disengaja.

### Phase 1 — Telemetry Normalization

Tujuan: activity feed menampilkan live decision log dengan benar.

Tasks:

1. Normalisasi status `submitted|confirmed|failed` ke `pending|success|failed` di API decisions atau client boundary.
2. Pastikan filter `all/success/failed/pending` bekerja untuk DB live.
3. Tambahkan minimal test atau driver check untuk mapping status.
4. Re-run web typecheck/build.

Files likely touched:

- `web/app/api/decisions/route.ts`
- `web/app/activity/page.tsx`
- possible test/helper file jika test infra web tersedia.

Exit criteria:

- Live DB row `confirmed` tampil sebagai success.
- Live DB row `submitted` tampil sebagai pending.
- Demo fallback tetap bekerja.

### Phase 2 — Commit New Navigation Surfaces

Tujuan: feature pages F-004/F-005/F-006 menjadi bagian resmi MVP.

Tasks:

1. Review `MobileTopBar` dan `Sidebar` route list.
2. Review pages:
   - allocations;
   - strategy;
   - settings.
3. Browser QA desktop/mobile untuk semua nav links.
4. Pastikan no 404 untuk `/allocations`, `/strategy`, `/settings`.

Exit criteria:

- Semua route dapat dibuka.
- Active nav state benar.
- Layout tidak overlap di mobile.

### Phase 3 — Live Demo Readiness

Tujuan: membuktikan MVP bukan hanya mock/demo fallback.

Tasks:

1. Isi env testnet:
   - vault address;
   - RPC URL;
   - agent private key;
   - agent DB path;
   - underlyings.
2. Jalankan agent satu tick di Base Sepolia.
3. Simpan tx hash rebalance sukses.
4. Buka dashboard dan pastikan source `live` muncul untuk snapshot.
5. Pastikan decision row live muncul di activity page.

Exit criteria:

- Ada tx hash rebalance sukses.
- `nextNonce` berubah.
- Dashboard menampilkan live state.
- Activity menunjukkan decision live, bukan hanya demo data.

### Phase 4 — Demo Script dan Operator Runbook

Tujuan: demo bisa diulang oleh reviewer/operator tanpa menebak.

Tasks:

1. Tulis runbook singkat:
   - setup env;
   - run tests;
   - deploy/verify contract jika perlu;
   - start agent;
   - start web;
   - demo path.
2. Tambahkan daftar caveat:
   - testnet only;
   - unaudited;
   - no real funds.
3. Tambahkan troubleshooting untuk:
   - RPC failure;
   - missing DB;
   - demo fallback;
   - wallet network mismatch.

Exit criteria:

- Fresh operator bisa menjalankan demo dari README/runbook.
- Tidak perlu membaca source untuk memahami happy path.

### Phase 5 — MVP Release Gate

Tujuan: menentukan apakah MVP siap demo.

Gate checklist:

- [ ] `forge test -vv` pass.
- [ ] `bun test` pass.
- [ ] `pnpm exec tsc --noEmit` pass.
- [ ] `pnpm build` pass; warnings accepted/documented.
- [ ] `/`, `/vault`, `/activity`, `/allocations`, `/strategy`, `/settings` open in browser.
- [ ] Wallet connect works on Base Sepolia.
- [ ] Deposit/withdraw works with testnet funds, or limitation clearly documented.
- [ ] Agent rebalance tx succeeds on Base Sepolia.
- [ ] Activity page shows live decision.
- [ ] Dashboard labels demo/live source honestly.
- [ ] README/runbook reflects actual commands.

## 10. MVP Acceptance Criteria

MVP dianggap siap untuk demo internal/hackathon jika:

1. Semua local verification pass:
   - contracts: 10/10 Foundry tests;
   - agent: 8/8 Bun tests;
   - web: typecheck/build pass.
2. Semua route utama tersedia dan usable.
3. Contract supports signed rebalance with nonce/deadline/signature checks.
4. Agent can submit at least one successful rebalance on testnet.
5. Dashboard can show live vault snapshot or explicitly mark demo fallback.
6. Activity telemetry displays agent decisions with correct normalized statuses.
7. Documentation says clearly: testnet/demo only, unaudited, no real funds.

## 11. Recommended MVP Priority Order

1. Fix status normalization in activity feed.
2. Browser QA all six web routes.
3. Run one live Base Sepolia agent rebalance and record tx hash.
4. Update README/runbook with exact demo flow.
5. Commit current new web pages and layout changes.
6. Optional: silence/triage build warnings if time allows.

## 12. Handoff Prompts untuk Agent Berikutnya

### Handoff A — Fix Activity Status

```text
Fix the live activity telemetry status mismatch.

Context:
- Agent DB writes statuses: submitted, confirmed, failed.
- Web activity UI/API expects: pending, success, failed.
- Relevant files: web/app/api/decisions/route.ts, web/app/activity/page.tsx, agent/src/db.ts.

Task:
- Normalize confirmed -> success, submitted -> pending, failed -> failed at the API boundary unless existing patterns suggest otherwise.
- Preserve demo fallback behavior.
- Verify pnpm exec tsc --noEmit and pnpm build from web/.
```

### Handoff B — Browser QA New MVP Pages

```text
Run browser QA for SerraRWA MVP pages.

Context:
- Routes: /, /vault, /activity, /allocations, /strategy, /settings.
- Navigation lives in web/components/layout/MobileTopBar.tsx and Sidebar.tsx.

Task:
- Start the Next app.
- Use a real browser to open every route on desktop and mobile width.
- Verify no 404, no fatal console errors, nav active state works, layout does not overlap.
- Report screenshots or exact failures.
```

### Handoff C — Live Testnet Smoke

```text
Run a live Base Sepolia smoke test for the SerraRWA MVP.

Context:
- Vault contract is in contracts/src/Vault.sol.
- Agent entry is agent/src/agent.ts.
- Web snapshot API is web/app/api/vault/snapshot/route.ts.

Task:
- Confirm env is configured for Base Sepolia.
- Run one agent tick/rebalance using testnet funds only.
- Record tx hash, nextNonce before/after, and dashboard source live/demo.
- Do not use real funds.
```

## 13. Final Recommendation

SerraRWA sudah cukup matang untuk **internal MVP/demo**, karena contract tests, agent tests, dan web production build sudah pass. Jangan posisikan sebagai production-ready vault sampai live smoke test, telemetry normalization, browser QA, dan runbook selesai.

MVP label yang paling akurat saat ini:

> SerraRWA — autonomous ERC-4626 RWA allocation demo on Base Sepolia with signed rebalancing, dashboard telemetry, and testnet-only controls.
