import type { GovernanceProposal } from "../lib/types.js";

export function buildSystemPrompt(): string {
  return `You are Tally, a governance intelligence agent for Solana and EVM protocols.

Your job is to review a pre-built governance digest, highlight what matters most, and explain which proposals deserve immediate attention.

Be clear and honest. Explain governance concepts simply. Non-technical readers should be able to understand your output.`;
}

export function buildUserPrompt(
  proposals: GovernanceProposal[],
  minImportanceScore: number
): string {
  if (proposals.length === 0) {
    return "No active governance proposals found. Check data sources and report the current governance landscape.";
  }

  const overview = proposals
    .map(
      (proposal) =>
        `- [${proposal.protocol}] "${proposal.title}" - ${proposal.status}, ends ${new Date(proposal.endsAt).toLocaleDateString()}, ${proposal.totalVotes.toLocaleString()} votes cast`
    )
    .join("\n");

  return `Found ${proposals.length} active governance proposals:

${overview}

These proposals have already been normalized, scored, and filtered at a minimum importance score of ${minImportanceScore}/10.

Write an operator note that explains the most important governance risks, what deserves immediate review, and which proposals can stay in watch mode.`;
}
