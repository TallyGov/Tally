import type { GovernanceProposal } from "../lib/types.js";
import { logger } from "../lib/logger.js";

const SNAPSHOT_SPACES = [
  "aave.eth",
  "uniswap",
  "compound-governance.eth",
  "curve.eth",
  "balancer.eth",
  "lido-snapshot.eth",
];

interface SnapshotProposal {
  id: string;
  title: string;
  body: string;
  state: string;
  scores: number[];
  scores_total: number;
  quorum: number;
  end: number;
  link: string;
  space: { id: string; name: string };
}

const QUERY = `
  query GetProposals($spaces: [String!]!) {
    proposals(
      first: 50
      where: { space_in: $spaces, state: "active" }
      orderBy: "created"
      orderDirection: desc
    ) {
      id title body state scores scores_total quorum end link
      space { id name }
    }
  }
`;

export async function fetchSnapshotProposals(
  graphqlUrl: string
): Promise<GovernanceProposal[]> {
  try {
    const res = await fetch(graphqlUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { spaces: SNAPSHOT_SPACES } }),
    });

    if (!res.ok) {
      logger.warn(`Snapshot GraphQL returned ${res.status}`);
      return [];
    }

    const json = (await res.json()) as { data?: { proposals: SnapshotProposal[] } };
    const raw = json.data?.proposals ?? [];

    return raw.map((p): GovernanceProposal => {
      const [forScore = 0, againstScore = 0, abstainScore = 0] = p.scores;
      return {
        id: p.id,
        protocol: p.space.name,
        title: p.title,
        summary: p.body.slice(0, 500),
        summarySource: "snapshot_body",
        status: p.state === "active" ? "active" : "passed",
        votesFor: forScore,
        votesAgainst: againstScore,
        votesAbstain: abstainScore,
        totalVotes: p.scores_total,
        quorumPct: p.quorum > 0 ? (p.scores_total / p.quorum) * 100 : 0,
        endsAt: p.end * 1000,
        endsAtSource: "snapshot_end",
        link: p.link,
        fetchedAt: Date.now(),
      };
    });
  } catch (err) {
    logger.error("Failed to fetch Snapshot proposals:", err);
    return [];
  }
}
