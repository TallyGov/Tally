<div align="center">

# Tally

**Governance aggregator for Solana and DeFi protocols.**
Pulls active proposals from Snapshot and Realms every 5 minutes. Claude summarizes them in plain English so you never miss a vote that matters.

[![Build](https://img.shields.io/github/actions/workflow/status/TallyGov/Tally/ci.yml?branch=main&style=flat-square&label=Build)](https://github.com/TallyGov/Tally/actions)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)
[![Built with Claude Agent SDK](https://img.shields.io/badge/Built%20with-Claude%20Agent%20SDK-2dd4bf?style=flat-square)](https://docs.anthropic.com/en/docs/agents-and-tools/claude-agent-sdk)

</div>

---

Most governance proposals die from apathy. The ones that pass quietly are usually the ones that matter most. `Tally` watches Snapshot.org and Solana Realms continuously, scores each proposal by importance, and uses Claude to translate governance-speak into plain language — along with a clear recommendation: support, oppose, or watch.

```
FETCH → SCORE → SUMMARIZE → CLASSIFY → DIGEST
```

---

## Live Vote Dashboard

![Tally Votes](assets/preview-votes.svg)

---

## Proposal Detail

![Tally Proposal](assets/preview-proposal.svg)

---

## Importance Scoring

| Score | Meaning |
|-------|---------|
| **9-10** | Emergency / security proposal — act now |
| **7-8** | High impact on tokenomics or protocol mechanics |
| **5-6** | Routine but worth tracking |
| **1-4** | Low priority, informational |

---

## Quick Start

```bash
git clone https://github.com/TallyGov/Tally
cd Tally && bun install
cp .env.example .env
bun run dev
```

---

## License

MIT

---

*governance is alpha.*
