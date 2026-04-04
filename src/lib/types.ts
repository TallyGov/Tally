export type VoteChoice = "yes" | "no" | "abstain";
export type ProposalStatus = "active" | "passed" | "defeated" | "cancelled" | "queued";

export interface GovernanceProposal {
  id: string;
  protocol: string;
  realm?: string;
  title: string;
  summary: string;
  status: ProposalStatus;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotes: number;
  quorumPct: number;
  endsAt: number;
  link: string;
  fetchedAt: number;
}

export interface ProposalSummary {
  proposalId: string;
  protocol: string;
  title: string;
  claudeSummary: string;
  sentiment: "bullish" | "bearish" | "neutral";
  importanceScore: number;
  keyPoints: string[];
  generatedAt: number;
}
