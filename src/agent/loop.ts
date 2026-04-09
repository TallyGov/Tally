import Anthropic from "@anthropic-ai/sdk";
import type { GovernanceProposal, ProposalSummary } from "../lib/types.js";
import type { Config } from "../lib/config.js";
import { buildSystemPrompt, buildUserPrompt } from "./prompts.js";
import { fetchSnapshotProposals } from "../fetchers/snapshot.js";
import { fetchRealmsProposals } from "../fetchers/realms.js";
import { buildLocalSummary } from "../analysis/summarizer.js";
import { printDigest } from "../output/printer.js";
import { logger } from "../lib/logger.js";

export async function runAgentLoop(config: Config): Promise<void> {
  logger.info("Fetching governance proposals...");
  const [snapshotProposals, realmsProposals] = await Promise.all([
    fetchSnapshotProposals(config.SNAPSHOT_GRAPHQL_URL),
    fetchRealmsProposals(config.REALMS_API_URL),
  ]);

  const allProposals: GovernanceProposal[] = [...snapshotProposals, ...realmsProposals];
  logger.info(`Fetched ${allProposals.length} active proposals`);

  const summaries: ProposalSummary[] = allProposals
    .map((proposal) => buildLocalSummary(proposal))
    .filter((summary) => summary.importanceScore >= config.MIN_IMPORTANCE_SCORE)
    .sort((a, b) => b.importanceScore - a.importanceScore);

  if (summaries.length > 0) {
    printDigest(summaries);
  } else {
    logger.info("No proposals cleared the minimum importance score");
    return;
  }

  const filteredProposals = summaries
    .map((summary) => allProposals.find((proposal) => proposal.id === summary.proposalId))
    .filter((proposal): proposal is GovernanceProposal => Boolean(proposal));

  const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 1200,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildUserPrompt(filteredProposals, config.MIN_IMPORTANCE_SCORE),
      },
    ],
  });

  const textBlocks = response.content.filter((block): block is Anthropic.TextBlock => block.type === "text");
  const finalText = textBlocks.map((block) => block.text).join("\n").trim();
  if (finalText) {
    console.log(`\n${finalText}`);
  }
}
