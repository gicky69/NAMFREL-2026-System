/**
 * Article category classifier.
 *
 * Uses the same lightweight lexicon/substring-matching technique as the
 * backend's sentiment fallback (see app/services/sentiment.py -
 * `_analyze_sentiment_fallback`), but instead of scoring polarity it buckets
 * each article into a content category ("what kind of story is this") so we
 * can chart the mix of incident types vs. positive/process stories.
 *
 * This runs client-side over `title + summary`, NOT over `keywords`, since
 * `keywords` in the DB is a general topic-tag array (e.g. "barmm",
 * "maguindanao") rather than an incident-type taxonomy.
 */

import type { NewsArticle } from "@/types";

export type ArticleCategory =
  | "violence_security"
  | "fraud_vote_buying"
  | "threats_unrest"
  | "peaceful_positive"
  | "election_process";

export interface CategoryMeta {
  key: ArticleCategory;
  label: string;
  color: string;
}

export const ARTICLE_CATEGORIES: CategoryMeta[] = [
  { key: "violence_security", label: "Violence & Security", color: "#dc2626" }, // red-600
  { key: "fraud_vote_buying", label: "Fraud & Vote-Buying", color: "#ea580c" }, // orange-600
  { key: "threats_unrest", label: "Threats & Unrest", color: "#d97706" }, // amber-600
  { key: "peaceful_positive", label: "Peaceful / Positive", color: "#16a34a" }, // green-600
  { key: "election_process", label: "Election Process & Other", color: "#64748b" }, // slate-500
];

const CATEGORY_LABEL_BY_KEY: Record<ArticleCategory, string> = Object.fromEntries(
  ARTICLE_CATEGORIES.map((c) => [c.key, c.label])
) as Record<ArticleCategory, string>;

// Word banks grouped by category. Sourced from / consistent with the
// POSITIVE_WORDS and NEGATIVE_WORDS lists in sentiment.py, split into more
// specific buckets so "shooting" and "vote buying" don't collapse into one
// generic "negative" bucket.
const VIOLENCE_WORDS = [
  "violence", "kill", "killed", "attack", "attacked", "bomb", "bombing",
  "gunman", "shooting", "shot", "explosion", "explosive", "grenade",
  "ambush", "clash", "clashes", "massacre", "behead", "hostage", "kidnap",
  "abduction", "terror", "arson", "looted", "looting", "burned",
];

const FRAUD_WORDS = [
  "fraud", "cheating", "rigging", "corrupt", "corruption",
];
const FRAUD_PHRASES = ["vote buying", "vote-buying"];

const THREAT_WORDS = [
  "intimidation", "threat", "threatened", "fear", "fearful", "dangerous",
  "boycott", "dispute", "tension", "tensions", "conflict", "protest",
  "rally", "unrest", "evacuate", "evacuated", "displace", "displaced",
];

const POSITIVE_WORDS = [
  "peaceful", "peace", "success", "successful", "progress", "support",
  "hope", "unity", "agreement", "agreed", "cooperation", "transparent",
  "fair", "orderly", "celebrated", "landslide", "victory", "win", "triumph",
  "confidence", "optimism", "endorsed", "respected", "reform", "improved",
  "benefit", "democratic", "legitimate", "turnout",
];

interface CategoryDef {
  key: ArticleCategory;
  words: string[];
  phrases?: string[];
}

// Order matters as a tiebreaker: if a story mentions both violence and
// process words, it should read as a security story, not a process story.
const CATEGORY_DEFS: CategoryDef[] = [
  { key: "violence_security", words: VIOLENCE_WORDS },
  { key: "fraud_vote_buying", words: FRAUD_WORDS, phrases: FRAUD_PHRASES },
  { key: "threats_unrest", words: THREAT_WORDS },
  { key: "peaceful_positive", words: POSITIVE_WORDS },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[\s,.;:!?'"\-—–()]+/)
    .filter(Boolean);
}

/**
 * Classify a single article into a content category based on title +
 * summary text. Falls back to "election_process" when no category-specific
 * words are found (i.e. routine election-process coverage).
 */
export function categorizeArticle(article: Pick<NewsArticle, "title" | "summary">): ArticleCategory {
  const text = `${article.title ?? ""} ${article.summary ?? ""}`.toLowerCase();
  const words = tokenize(text);

  let bestCategory: ArticleCategory = "election_process";
  let bestScore = 0;

  for (const def of CATEGORY_DEFS) {
    let score = 0;

    for (const word of words) {
      if (def.words.some((w) => word === w || (w.length >= 4 && word.includes(w)))) {
        score++;
      }
    }
    if (def.phrases) {
      for (const phrase of def.phrases) {
        if (text.includes(phrase)) score++;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestCategory = def.key;
    }
  }

  return bestCategory;
}

export function categoryLabel(key: ArticleCategory): string {
  return CATEGORY_LABEL_BY_KEY[key] ?? key;
}

/**
 * Compute category counts across a list of articles, ready to feed into
 * the PieChart component.
 */
export function computeCategoryCounts(
  articles: Array<Pick<NewsArticle, "title" | "summary">>
): { category: ArticleCategory; label: string; color: string; count: number }[] {
  const counts: Record<ArticleCategory, number> = {
    violence_security: 0,
    fraud_vote_buying: 0,
    threats_unrest: 0,
    peaceful_positive: 0,
    election_process: 0,
  };

  for (const article of articles) {
    counts[categorizeArticle(article)]++;
  }

  return ARTICLE_CATEGORIES.map((c) => ({
    category: c.key,
    label: c.label,
    color: c.color,
    count: counts[c.key],
  }));
}
