import type { GovernanceProposal } from "../lib/types.js";

export function buildSystemPrompt(): string {
  return `You are Tally, a DeFi governance intelligence agent for Solana and EVM protocols.

Your job is to track active governance proposals, summarize what they mean in plain language, assess their potential impact on token prices and protocol health, and help users make informed voting decisions.

You have access to the following tools:
- fetch_snapshot_proposals: Get active proposals from Snapshot.org
- fetch_realms_proposals: Get active proposals from Solana Realms
- summarize_proposal: Generate a plain-language summary of a specific proposal
- assess_impact: Evaluate the potential market impact of a proposal outcome

Be clear and honest. Explain governance concepts simply. Non-technical readers should be able to understand your output.`;
}

export function buildUserPrompt(proposals: GovernanceProposal[]): string {
  if (proposals.length === 0) {
    return "No active governance proposals found. Check data sources and report the current governance landscape.";
  }

  const overview = proposals
    .map(
      (p) =>
        `- [${p.protocol}] "${p.title}" — ${p.status}, ends ${new Date(p.endsAt).toLocaleDateString()}, ${p.totalVotes.toLocaleString()} votes cast`
    )
    .join("\n");

  return `Found ${proposals.length} active governance proposals:

${overview}

Summarize each proposal in plain language. Rank by importance. Flag any that could meaningfully impact token prices or protocol operation. Give a recommendation for each (support / oppose / watch).`;
}
