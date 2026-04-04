import Anthropic from "@anthropic-ai/sdk";
import type { GovernanceProposal, ProposalSummary } from "../lib/types.js";
import type { Config } from "../lib/config.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { fetchSnapshotProposals } from "../fetchers/snapshot.js";
import { fetchRealmsProposals } from "../fetchers/realms.js";
import { buildLocalSummary, computeImportanceScore } from "../analysis/summarizer.js";
import { printDigest } from "../output/printer.js";
import { logger } from "../lib/logger.js";

const TOOLS: Anthropic.Tool[] = [
  {
    name: "fetch_snapshot_proposals",
    description: "Fetch active governance proposals from Snapshot.org for major DeFi protocols.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "fetch_realms_proposals",
    description: "Fetch active governance proposals from Solana Realms DAOs.",
    input_schema: { type: "object" as const, properties: {}, required: [] },
  },
  {
    name: "summarize_proposal",
    description: "Generate a plain-language summary and importance score for a specific proposal.",
    input_schema: {
      type: "object" as const,
      properties: {
        proposal_id: { type: "string", description: "The proposal ID to summarize" },
      },
      required: ["proposal_id"],
    },
  },
  {
    name: "assess_impact",
    description: "Evaluate the potential market impact of a proposal and its outcome on token price.",
    input_schema: {
      type: "object" as const,
      properties: {
        proposal_id: { type: "string", description: "The proposal ID to assess" },
      },
      required: ["proposal_id"],
    },
  },
];

export async function runAgentLoop(config: Config): Promise<void> {
  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });

  logger.info("Fetching governance proposals...");
  const [snapshotProposals, realmsProposals] = await Promise.all([
    fetchSnapshotProposals(config.SNAPSHOT_GRAPHQL_URL),
    fetchRealmsProposals(config.REALMS_API_URL),
  ]);

  const allProposals: GovernanceProposal[] = [...snapshotProposals, ...realmsProposals];
  logger.info(`Fetched ${allProposals.length} active proposals`);

  const summaryCache = new Map<string, ProposalSummary>();

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: buildUserPrompt(allProposals) },
  ];

  let iterations = 0;
  const MAX_ITER = 10;

  while (iterations < MAX_ITER) {
    iterations++;

    const response = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 4096,
      system: buildSystemPrompt(),
      tools: TOOLS,
      messages,
    });

    messages.push({ role: "assistant", content: response.content });

    if (response.stop_reason === "end_turn") {
      const textBlocks = response.content.filter((b): b is Anthropic.TextBlock => b.type === "text");
      const finalText = textBlocks.map((b) => b.text).join("\n");
      console.log("\n" + finalText);

      const summaries = Array.from(summaryCache.values()).sort(
        (a, b) => b.importanceScore - a.importanceScore
      );
      if (summaries.length > 0) {
        printDigest(summaries);
      }
      break;
    }

    if (response.stop_reason !== "tool_use") break;

    const toolResults: Anthropic.ToolResultBlockParam[] = [];

    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      let result: string;

      if (block.name === "fetch_snapshot_proposals") {
        const proposals = await fetchSnapshotProposals(config.SNAPSHOT_GRAPHQL_URL);
        allProposals.push(...proposals.filter((p) => !allProposals.find((e) => e.id === p.id)));
        result = JSON.stringify(proposals);
      } else if (block.name === "fetch_realms_proposals") {
        const proposals = await fetchRealmsProposals(config.REALMS_API_URL);
        allProposals.push(...proposals.filter((p) => !allProposals.find((e) => e.id === p.id)));
        result = JSON.stringify(proposals);
      } else if (block.name === "summarize_proposal") {
        const input = block.input as { proposal_id: string };
        const proposal = allProposals.find((p) => p.id === input.proposal_id);
        if (!proposal) {
          result = JSON.stringify({ error: "Proposal not found" });
        } else {
          const summary = buildLocalSummary(proposal);
          summaryCache.set(proposal.id, summary);
          result = JSON.stringify(summary);
        }
      } else if (block.name === "assess_impact") {
        const input = block.input as { proposal_id: string };
        const proposal = allProposals.find((p) => p.id === input.proposal_id);
        if (!proposal) {
          result = JSON.stringify({ error: "Proposal not found" });
        } else {
          const score = computeImportanceScore(proposal);
          result = JSON.stringify({
            proposal_id: proposal.id,
            protocol: proposal.protocol,
            importance_score: score,
            votes_for_pct:
              proposal.totalVotes > 0
                ? ((proposal.votesFor / proposal.totalVotes) * 100).toFixed(1)
                : "0",
            quorum_met: proposal.quorumPct >= 100,
            ends_at: new Date(proposal.endsAt).toISOString(),
          });
        }
      } else {
        result = JSON.stringify({ error: `Unknown tool: ${block.name}` });
      }

      toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
    }

    messages.push({ role: "user", content: toolResults });
  }
}
