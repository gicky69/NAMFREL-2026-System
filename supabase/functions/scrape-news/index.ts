import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ScrapeSource {
  name: string;
  url: string;
  selectors: {
    article: string;
    title: string;
    link: string;
    date: string;
    summary: string;
  };
  isRss?: boolean;
}

const BARMM_KEYWORDS = [
  "barmm", "bangsamoro", "maguindanao", "lanao del sur", "sulu",
  "tawi-tawi", "basilan", "marawi", "cotabato", "muslim mindanao",
  "bangsamoro election", "barmm election", "parliament", "bta",
  "bangsamoro transition authority", "regional governor",
];

const BATANES_KEYWORDS = [
  "batanes", "basco", "itbayat", "mahatao", "sabtang", "uyugan",
  "ivana, batanes", "ivana batanes", "ivatan",
  "batanes election", "batanes special election", "batanes special election 2026",
  "batanes congressional district special election",
  "batanes lone congressional district special election",
  "november 28, 2026 special election", "november 28 2026 special election",
  "special election in batanes", "lone district of batanes",
  "batanes polls", "comelec batanes",
];

const ALL_KEYWORDS = [...BARMM_KEYWORDS, ...BATANES_KEYWORDS];

const SCRAPE_SOURCES: ScrapeSource[] = [
  {
    name: "Rappler",
    url: "https://www.rappler.com/feed",
    isRss: true,
    selectors: { article: "item", title: "title", link: "link", date: "pubDate", summary: "description" },
  },
  {
    name: "Inquirer.net",
    url: "https://www.inquirer.net/fullfeed",
    isRss: true,
    selectors: { article: "item", title: "title", link: "link", date: "pubDate", summary: "description" },
  },
  {
    name: "PhilStar.com",
    url: "https://www.philstar.com/rss/headlines",
    isRss: true,
    selectors: { article: "item", title: "title", link: "link", date: "pubDate", summary: "description" },
  },
  {
    name: "Manila Bulletin",
    url: "https://mb.com.ph/feed/",
    isRss: true,
    selectors: { article: "item", title: "title", link: "link", date: "pubDate", summary: "description" },
  },
  {
    name: "GMA News",
    url: "https://www.gmanetwork.com/news/rss/feed/headlines",
    isRss: true,
    selectors: { article: "item", title: "title", link: "link", date: "pubDate", summary: "description" },
  },
  {
    name: "ABS-CBN News",
    url: "https://news.abs-cbn.com/feed",
    isRss: true,
    selectors: { article: "item", title: "title", link: "link", date: "pubDate", summary: "description" },
  },
];

const POSITIVE_WORDS = [
  "peaceful", "peace", "success", "successful", "progress", "progress",
  "support", "hope", "unity", "agreement", "agreed", "cooperation",
  "transparent", "fair", "orderly", "celebrated", "landslide", "victory",
  "win", "triumph", "confidence", "optimism", "endorsed", "respected",
  "reform", "improved", "benefit", "democratic", "legitimate", "turnout",
];

const NEGATIVE_WORDS = [
  "violence", "kill", "killed", "attack", "attacked", "bomb", "bombing",
  "fraud", "cheating", "intimidation", "threat", "threatened", "gunman",
  "shooting", "shot", "explosion", "explosive", "grenade", "ambush",
  "clash", "clashes", "evacuate", "evacuated", "displace", "displaced",
  "corrupt", "corruption", "vote buying", "vote-buying", "rigging",
  "protest", "rally", "unrest", "tension", "tensions", "conflict",
  "fear", "fearful", "dangerous", "unrest", "boycott", "dispute",
  "massacre", "behead", "hostage", "kidnap", "abduction", "terror",
  "fire", "burned", "arson", "looted", "looting",
];

function analyzeSentiment(text: string): { score: number; label: string } {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,.;:!?'"\-—–()]+|/).filter(Boolean);
  let positive = 0;
  let negative = 0;

  for (const word of words) {
    if (POSITIVE_WORDS.some((p) => word.includes(p) || p.includes(word))) {
      positive++;
    }
    if (NEGATIVE_WORDS.some((n) => word.includes(n) || n.includes(word))) {
      negative++;
    }
  }

  // Also check for multi-word phrases
  for (const phrase of ["vote buying", "vote-buying"]) {
    if (lower.includes(phrase)) negative++;
  }

  const total = positive + negative;
  if (total === 0) return { score: 0, label: "neutral" };

  const score = (positive - negative) / total;

  let label = "neutral";
  if (score > 0.15) label = "positive";
  else if (score < -0.15) label = "negative";

  return { score: Math.round(score * 100) / 100, label };
}

function hasIvanaBatanes(lower: string): boolean {
  if (!/\bivana\b/.test(lower)) return false;
  return ["batanes", "ivatan", "basco", "itbayat", "mahatao", "sabtang", "uyugan"].some((ctx) =>
    lower.includes(ctx)
  );
}

function detectRegion(text: string): "barmm" | "batanes" {
  const lower = text.toLowerCase();
  if (BATANES_KEYWORDS.some((kw) => lower.includes(kw)) || hasIvanaBatanes(lower)) {
    return "batanes";
  }
  return "barmm";
}

function extractKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const keyword of ALL_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.push(keyword);
    }
  }
  if (hasIvanaBatanes(lower)) {
    found.push("ivana, batanes");
  }
  return [...new Set(found)].slice(0, 8);
}

function detectProvince(text: string): string | null {
  const lower = text.toLowerCase();
  const provinces = [
    "basilan", "lanao del sur", "maguindanao del norte",
    "maguindanao del sur", "maguindanao", "sulu", "tawi-tawi",
    "marawi city", "cotabato city", "lamitan city",
  ];
  for (const prov of provinces) {
    if (lower.includes(prov)) {
      return prov.charAt(0).toUpperCase() + prov.slice(1);
    }
  }
  const batanesLocations = ["batanes", "basco", "itbayat", "mahatao", "sabtang", "uyugan"];
  if (batanesLocations.some((loc) => lower.includes(loc)) || hasIvanaBatanes(lower)) {
    return "Batanes";
  }
  return null;
}

function isRelevantArticle(title: string, summary: string): boolean {
  const text = (title + " " + summary).toLowerCase();
  return ALL_KEYWORDS.some((kw) => text.includes(kw)) || hasIvanaBatanes(text);
}

function stripHtml(html: string): string {
  return html
    .replace(/<![CDATA[|]]>/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function parseRssItems(xml: string, source: ScrapeSource): Array<{
  title: string;
  url: string;
  publishedDate: string | null;
  summary: string;
}> {
  const items: Array<{
    title: string;
    url: string;
    publishedDate: string | null;
    summary: string;
  }> = [];

  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const itemXml = match[1];

    const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
    const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
    const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
    const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);

    const title = titleMatch ? stripHtml(titleMatch[1].trim()) : "";
    const url = linkMatch ? linkMatch[1].trim() : "";
    const publishedDate = dateMatch ? dateMatch[1].trim() : null;
    const summary = descMatch ? stripHtml(descMatch[1].trim()) : "";

    if (title && url) {
      items.push({ title, url, publishedDate, summary });
    }
  }

  return items;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let body: { source?: string } = {};
    try {
      body = await req.json();
    } catch {
      // Empty body — scrape all sources
    }

    const sources = body.source
      ? SCRAPE_SOURCES.filter((s) => s.name === body.source)
      : SCRAPE_SOURCES;

    let totalScraped = 0;
    let totalSkipped = 0;
    const errors: string[] = [];

    for (const source of sources) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(source.url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });
        clearTimeout(timeout);

        if (!response.ok) {
          errors.push(`${source.name}: HTTP ${response.status}`);
          continue;
        }

        const xml = await response.text();
        const items = parseRssItems(xml, source);

        for (const item of items) {
          // Check if BARMM or Batanes related
          if (!isRelevantArticle(item.title, item.summary)) {
            totalSkipped++;
            continue;
          }

          // Check if already exists
          const { data: existing } = await supabase
            .from("news_articles")
            .select("id")
            .eq("url", item.url)
            .maybeSingle();

          if (existing) {
            totalSkipped++;
            continue;
          }

          const fullText = `${item.title} ${item.summary}`;
          const sentiment = analyzeSentiment(fullText);
          const keywords = extractKeywords(fullText);
          const province = detectProvince(fullText);
          const region = detectRegion(fullText);

          const { error: insertError } = await supabase
            .from("news_articles")
            .insert({
              title: item.title,
              url: item.url,
              source: source.name,
              published_date: item.publishedDate,
              summary: item.summary.substring(0, 500),
              sentiment_score: sentiment.score,
              sentiment_label: sentiment.label,
              keywords,
              province,
              region,
            });

          if (insertError) {
            errors.push(`${source.name}: ${insertError.message}`);
          } else {
            totalScraped++;
          }
        }
      } catch (err) {
        errors.push(`${source.name}: ${err.message}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        scraped: totalScraped,
        skipped: totalSkipped,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
