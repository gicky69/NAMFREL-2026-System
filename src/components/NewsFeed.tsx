import { useState, useEffect, useCallback } from "react";
import { RefreshCw, ExternalLink, MapPin, Search, Filter } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { NewsArticle, SentimentLabel } from "@/types";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/States";
import { SentimentBadge } from "@/components/SentimentBadge";
import { formatDate } from "@/lib/sentiment";

import { auth } from "@/lib/firebase";

type Profile = {
  email: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
};

type Props = {
  profile: Profile | null;
  onLogout: () => void;
};

export default function NewsFeed({ profile, onLogout }: Props) {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [globalScraping, setGlobalScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);
  const [scrapeErrors, setScrapeErrors] = useState<string[]>([]);
  const [showScrapeErrors, setShowScrapeErrors] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sentimentFilter, setSentimentFilter] = useState<SentimentLabel | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");

  const API_URL = import.meta.env.VITE_API_URL;

  const isAdmin =
    profile?.role === "admin" ||
    profile?.role === "super_admin";


  const fetchArticles = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: err } = await supabase
        .from("news_articles")
        .select("*")
        .order("published_date", { ascending: false });
      if (err) throw err;
      setArticles(data || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const fetchScrapeStatus = useCallback(async () => {

    if (!isAdmin) {
      setGlobalScraping(false);
      return;
    }
    
    try {
      const response = await fetch(
        `${API_URL}/api/news/scrape-status`
      );

      if (!response.ok) return;

      const result = await response.json();
      setGlobalScraping(result.is_scraping);
    } catch {
      // Keep the current status if the status check fails
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchScrapeStatus();
  }, [fetchScrapeStatus]);

  // get status only for admins, since the scrape button is only visible to them
  useEffect(() => {
    if (!isAdmin) return;
    const interval = setInterval(() => {
      fetchScrapeStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [isAdmin, fetchScrapeStatus]);


  const handleScrape = async () => {
    setScraping(true);
    setGlobalScraping(true);
    setScrapeMessage(null);
    setScrapeErrors([]);
    setShowScrapeErrors(false);

    // check profile role before scraping
    if (!isAdmin) {
      setScraping(false);
      setGlobalScraping(false);
      setScrapeMessage("Error: You are not authorized to scrape news.");
      return;
    }

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_URL}/api/news/scrape`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        },
      });

      if (response.status === 409) {
        setScraping(false);
        setScrapeMessage("Error: A scrape is already in progress.");
        await fetchScrapeStatus();
        return;
      }

      if (!response.ok) {
        setScraping(false);
        throw new Error(`Scrape Failed (${response.status})`);
      }

      const result = await response.json();

      const errors = result.errors || [];
      setScrapeErrors(errors);
      setScrapeMessage(
        `Scraped ${result.scraped || 0} new article${
          result.scraped === 1 ? "" : "s"
        }, skipped ${result.skipped || 0} existing or non-BARMM articles${
          errors.length
            ? `. ${errors.length} source issue${errors.length === 1 ? "" : "s"}`
            : ""
        }.`
      );

      // Refresh News Feed UI
      await fetchArticles();

    } catch (err) {
      setScrapeMessage(
        `Error: ${err instanceof Error ? err.message : "Unknown Error"}`
      );
    } finally {
      setScraping(false);

      // Get the actual global status from backend
      await fetchScrapeStatus();
    }
  };

  // "Verified" = article_status === "verified" (as opposed to pending/rejected)
  const verifiedArticles = articles.filter((a) => a.status === "verified");

  const sources = [...new Set(verifiedArticles.map((a) => a.source).filter(Boolean))] as string[];

  const filteredArticles = verifiedArticles.filter((article) => {
    if (sentimentFilter !== "all" && article.sentiment_label !== sentimentFilter) return false;
    if (sourceFilter !== "all" && article.source !== sourceFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesTitle = article.title.toLowerCase().includes(q);
      const matchesSummary = article.summary?.toLowerCase().includes(q);
      const matchesKeywords = article.keywords?.some((k) => k.toLowerCase().includes(q));
      if (!matchesTitle && !matchesSummary && !matchesKeywords) return false;
    }
    return true;
  });

  if (loading) return <LoadingSpinner label="Loading news articles..." />;
  if (error) return <ErrorState message={error} />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">News & Sentiment Feed</h2>
          <p className="text-sm text-slate-500 mt-1">
            BARMM election news scraped from Philippine news outlets with automated sentiment analysis
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={handleScrape}
            disabled={scraping || globalScraping}
            className="btn-primary flex items-center gap-2 text-sm self-start disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              className={`w-4 h-4 ${
                scraping || globalScraping ? "animate-spin" : ""
              }`}
            />

            {scraping
              ? "Scraping..."
              : globalScraping
              ? "Scraping in progress..."
              : "Scrape Latest News"}
          </button>
        )}

      </div>

      {scrapeMessage && (
        <div className={`card p-4 text-sm animate-fade-in ${scrapeMessage.startsWith("Error") ? "border-red-200 bg-red-50" : "border-teal-200 bg-teal-50"}`}>
          <div className="flex items-center justify-between gap-3">
            <p className={scrapeMessage.startsWith("Error") ? "text-red-700" : "text-teal-700"}>{scrapeMessage}</p>
            {scrapeErrors.length > 0 && (
              <button
                onClick={() => setShowScrapeErrors((value) => !value)}
                className="text-xs text-amber-700 bg-amber-100 px-2 py-1 rounded shrink-0 hover:bg-amber-200 transition-colors"
              >
                Details {showScrapeErrors ? "▲" : "▼"}
              </button>
            )}
          </div>
          {showScrapeErrors && (
            <ul className="mt-3 space-y-1 text-xs text-slate-500 border-t border-teal-200 pt-3">
              {scrapeErrors.map((error, index) => (
                <li key={index} className="truncate" title={error}>
                  {error.split(":")[0]}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search articles, keywords..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <select
                value={sentimentFilter}
                onChange={(e) => setSentimentFilter(e.target.value as SentimentLabel | "all")}
                className="input-field pl-10 pr-8 appearance-none cursor-pointer"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="negative">Negative</option>
                <option value="neutral">Neutral</option>
              </select>
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="input-field pr-8 appearance-none cursor-pointer"
            >
              <option value="all">All Sources</option>
              {sources.map((src) => (
                <option key={src} value={src}>{src}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-slate-500">
        Showing {filteredArticles.length} of {verifiedArticles.length} verified articles
      </p>

      {/* Articles list */}
      {filteredArticles.length === 0 ? (
        <EmptyState
          title="No articles found"
          message={verifiedArticles.length === 0 ? "Click 'Scrape Latest News' to fetch BARMM election news." : "Try adjusting your filters or search query."}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredArticles.map((article) => (
            <article key={article.id} className="card p-5 hover:shadow-md transition-all duration-200 animate-fade-in">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-xs font-semibold text-white bg-primary px-2 py-0.5 rounded">
                      {article.source || "Unknown"}
                    </span>
                    <span className="text-xs text-slate-400">{formatDate(article.published_date)}</span>
                    {article.province && (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {article.province}
                      </span>
                    )}
                    <SentimentBadge label={article.sentiment_label} />
                  </div>
                  <h3 className="font-bold text-slate-900 mb-2 leading-snug">{article.title}</h3>
                  {article.summary && (
                    <p className="text-sm text-slate-600 line-clamp-3 mb-3">{article.summary}</p>
                  )}
                  {article.keywords && article.keywords.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap mb-3">
                      {article.keywords.map((kw) => (
                        <span key={kw} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {kw}
                        </span>
                      ))}
                    </div>
                  )}
                  {article.url && (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                    >
                      Read full article <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}