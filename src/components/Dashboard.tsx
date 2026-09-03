import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Newspaper, AlertTriangle, Activity, MapPin, BarChart3, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import type { NewsArticle, Incident, SentimentLabel } from "@/types";
import { INCIDENT_TYPES, SEVERITY_LEVELS } from "@/types";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/States";
import { SentimentBadge } from "@/components/SentimentBadge";
import { formatDate } from "@/lib/sentiment";

interface DashboardData {
  articles: NewsArticle[];
  incidents: Incident[];
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scraping, setScraping] = useState(false);
  const [scrapeMessage, setScrapeMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [articlesRes, incidentsRes] = await Promise.all([
        supabase.from("news_articles").select("*").order("published_date", { ascending: false }).limit(100),
        supabase.from("incidents").select("*").order("created_at", { ascending: false }).limit(100),
      ]);

      if (articlesRes.error) throw articlesRes.error;
      if (incidentsRes.error) throw incidentsRes.error;

      setData({ articles: articlesRes.data || [], incidents: incidentsRes.data || [] });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleScrape = async () => {
    setScraping(true);
    setScrapeMessage(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-news`;
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error(`Scrape failed (${response.status})`);
      const result = await response.json();
      setScrapeMessage(
        `Scraped ${result.scraped || 0} new articles, skipped ${result.skipped || 0} existing/non-BARMM articles${
          result.errors ? `. Some sources had issues: ${result.errors.join("; ")}` : ""
        }`
      );
      fetchData();
    } catch (err) {
      setScrapeMessage(`Error: ${err instanceof Error ? err.message : "Unknown error"}`);
    } finally {
      setScraping(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading dashboard data..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="No data available" />;

  const { articles, incidents } = data;

  // Sentiment distribution
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 } as Record<SentimentLabel, number>;
  articles.forEach((a) => sentimentCounts[a.sentiment_label]++);
  const totalArticles = articles.length;

  // Incident type distribution
  const incidentTypeCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    incidentTypeCounts[i.incident_type] = (incidentTypeCounts[i.incident_type] || 0) + 1;
  });

  // Province distribution for incidents
  const provinceCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    provinceCounts[i.province] = (provinceCounts[i.province] || 0) + 1;
  });

  // Severity distribution
  const severityCounts: Record<string, number> = {};
  incidents.forEach((i) => {
    severityCounts[i.severity] = (severityCounts[i.severity] || 0) + 1;
  });

  // Average sentiment
  const avgSentiment = totalArticles > 0
    ? articles.reduce((sum, a) => sum + a.sentiment_score, 0) / totalArticles
    : 0;

  // Source distribution
  const sourceCounts: Record<string, number> = {};
  articles.forEach((a) => {
    if (a.source) sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  });

  const recentArticles = articles.slice(0, 5);
  const recentIncidents = incidents.slice(0, 5);

  const SentimentIcon = avgSentiment > 0.15 ? TrendingUp : avgSentiment < -0.15 ? TrendingDown : Minus;
  const sentimentColor = avgSentiment > 0.15 ? "text-green-600" : avgSentiment < -0.15 ? "text-red-600" : "text-slate-500";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Election Sentiment Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time monitoring of news sentiment and incident reports across the Bangsamoro Autonomous Region
          </p>
        </div>
        <button
          onClick={handleScrape}
          disabled={scraping}
          className="btn-primary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className={`w-4 h-4 ${scraping ? "animate-spin" : ""}`} />
          {scraping ? "Scraping News..." : "Scrape Latest News"}
        </button>
      </div>

      {scrapeMessage && (
        <div className={`card p-4 text-sm animate-fade-in ${scrapeMessage.startsWith("Error") ? "border-red-200 bg-red-50" : "border-teal-200 bg-teal-50"}`}>
          <p className={scrapeMessage.startsWith("Error") ? "text-red-700" : "text-teal-700"}>{scrapeMessage}</p>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">News Articles</span>
            <Newspaper className="w-5 h-5 text-teal-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{totalArticles}</p>
          <p className="text-xs text-slate-400 mt-1">Scraped & analyzed</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">Avg Sentiment</span>
            <SentimentIcon className={`w-5 h-5 ${sentimentColor}`} />
          </div>
          <p className={`text-3xl font-bold ${sentimentColor}`}>
            {avgSentiment > 0 ? "+" : ""}{avgSentiment.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            {avgSentiment > 0.15 ? "Positive leaning" : avgSentiment < -0.15 ? "Negative leaning" : "Neutral"}
          </p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">Incident Reports</span>
            <AlertTriangle className="w-5 h-5 text-orange-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{incidents.length}</p>
          <p className="text-xs text-slate-400 mt-1">Community reported</p>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">Critical Incidents</span>
            <Activity className="w-5 h-5 text-red-600" />
          </div>
          <p className="text-3xl font-bold text-slate-900">{severityCounts["critical"] || 0}</p>
          <p className="text-xs text-slate-400 mt-1">High severity cases</p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sentiment Distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900">News Sentiment Distribution</h3>
          </div>
          {totalArticles === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No articles yet. Click "Scrape Latest News" to fetch data.</p>
          ) : (
            <div className="space-y-4">
              {(["positive", "negative", "neutral"] as SentimentLabel[]).map((label) => {
                const count = sentimentCounts[label];
                const pct = totalArticles > 0 ? (count / totalArticles) * 100 : 0;
                const color = label === "positive" ? "bg-green-500" : label === "negative" ? "bg-red-500" : "bg-slate-400";
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 capitalize">{label}</span>
                      <span className="text-sm text-slate-500">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Incident Type Distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <h3 className="font-bold text-slate-900">Incident Classification</h3>
          </div>
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No incidents reported yet.</p>
          ) : (
            <div className="space-y-3">
              {INCIDENT_TYPES.map((type) => {
                const count = incidentTypeCounts[type.value] || 0;
                const pct = incidents.length > 0 ? (count / incidents.length) * 100 : 0;
                return (
                  <div key={type.value}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: type.color }} />
                        {type.label}
                      </span>
                      <span className="text-sm text-slate-500">{count}</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ width: `${pct}%`, backgroundColor: type.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Province & Severity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Province distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-teal-600" />
            <h3 className="font-bold text-slate-900">Incidents by Province</h3>
          </div>
          {Object.keys(provinceCounts).length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No incidents reported yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(provinceCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([province, count]) => {
                  const pct = (count / incidents.length) * 100;
                  return (
                    <div key={province}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-700">{province}</span>
                        <span className="text-sm text-slate-500">{count}</span>
                      </div>
                      <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-teal-500 rounded-full transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* Severity distribution */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-slate-900">Incident Severity Levels</h3>
          </div>
          {incidents.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center">No incidents reported yet.</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {SEVERITY_LEVELS.map((sev) => {
                const count = severityCounts[sev.value] || 0;
                return (
                  <div key={sev.value} className="rounded-lg p-4 border-2" style={{ borderColor: `${sev.color}30`, backgroundColor: `${sev.color}08` }}>
                    <p className="text-2xl font-bold" style={{ color: sev.color }}>{count}</p>
                    <p className="text-sm font-medium text-slate-600 mt-1">{sev.label}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent articles */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-4">Recent News Articles</h3>
          {recentArticles.length === 0 ? (
            <EmptyState title="No articles yet" message="Click 'Scrape Latest News' to fetch BARMM election news." />
          ) : (
            <div className="space-y-3">
              {recentArticles.map((article) => (
                <div key={article.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{article.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-slate-400">{article.source}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{formatDate(article.published_date)}</span>
                      <SentimentBadge label={article.sentiment_label} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent incidents */}
        <div className="card p-6">
          <h3 className="font-bold text-slate-900 mb-4">Recent Incident Reports</h3>
          {recentIncidents.length === 0 ? (
            <EmptyState title="No incidents yet" message="Incident reports submitted by the community will appear here." />
          ) : (
            <div className="space-y-3">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{incident.title}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs text-slate-400">{incident.province}</span>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{formatDate(incident.incident_date)}</span>
                      <SentimentBadge label={incident.sentiment_label} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
