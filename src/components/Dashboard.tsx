import { useState, useEffect, useCallback } from "react";
import { TrendingUp, TrendingDown, Minus, Newspaper, AlertTriangle, Activity, MapPin, BarChart3, RefreshCw, FileWarning, CheckCircle } from "lucide-react";
import type { NewsArticle, SentimentLabel } from "@/types";
import { INCIDENT_TYPES, SEVERITY_LEVELS } from "@/types";
import { LoadingSpinner, ErrorState, EmptyState } from "@/components/States";
import { SentimentBadge } from "@/components/SentimentBadge";
import { formatDate } from "@/lib/sentiment";
import { ProvinceMap } from "@/components/ProvinceMap";
import { PieChart } from "@/components/PieChart";
import { computeCategoryCounts } from "@/lib/articleCategories";

const API_URL = import.meta.env.VITE_API_URL;

interface IncidentSummary {
  verified: {
    total: number;
    critical: number;
    severity: Record<string, number>;
    incident_type: Record<string, number>;
    provinces: Record<string, number>;
  };
  unverified: {
    total: number;
    critical: number;
    severity: Record<string, number>;
  };
}

interface DashboardData {
  articles: NewsArticle[];
  incidentSummary: IncidentSummary;
}

type IncidentCategory = {
  name: string;
  description: string | null;
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {

      const [articleRes, incidentRes] = await Promise.all([
        fetch(`${API_URL}/api/articles`),
        fetch(`${API_URL}/api/incidents/summary`)
      ]);

      for (const res of [articleRes, incidentRes]) {
        if (!res.ok) {
          let detail = `Request Failed with status ${res.status}`;
          try {
            const body = await res.json();
            if (body?.detail) detail = body.detail;
          } catch {}
          throw new Error(detail);
        }
      }

      const [articles, incidentSummary] = await Promise.all([
        articleRes.json(),
        incidentRes.json(),
      ]);

      setData({
        articles: articles || [],
        incidentSummary: {
          verified: {
            total: incidentSummary?.verified?.total ?? 0,
            critical: incidentSummary?.verified?.critical ?? 0,
            severity: incidentSummary?.verified?.severity ?? {},
            incident_type: incidentSummary?.verified?.incident_type ?? {},
            provinces: incidentSummary?.verified?.provinces ?? {},
          },
          unverified: {
            total: incidentSummary?.unverified?.total ?? 0,
            critical: incidentSummary?.unverified?.critical ?? 0,
            severity: incidentSummary?.unverified?.severity ?? {},
          },
        },
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  if (loading) return <LoadingSpinner label="Loading data..." />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <ErrorState message="No data available" />;

  const { articles, incidentSummary } = data;
  
  // Sentiment distribution for verified
  const sentimentCounts = { positive: 0, negative: 0, neutral: 0 } as Record<SentimentLabel, number>;
  articles.forEach((a) => {
    if (a.sentiment_label) sentimentCounts[a.sentiment_label]++;
  });

  const totalArticles = articles.length;

  // Article category breakdown (violence, fraud/vote-buying, threats,
  // peaceful/positive, general process) derived from title + summary text
  const categoryCounts = computeCategoryCounts(articles);

  // Average sentiment
  const avgSentiment = articles.length > 0
    ? articles.reduce((sum, a) => sum + a.sentiment_score, 0) / articles.length
    : 0;

  // Source distribution
  const sourceCounts: Record<string, number> = {};
  articles.forEach((a) => {
    if (a.source) sourceCounts[a.source] = (sourceCounts[a.source] || 0) + 1;
  });

  // "Verified" articles = article_status === "verified" (as opposed to pending/rejected)
  const verifiedArticles = articles.filter((a) => a.status === "verified");

  const recentArticles = verifiedArticles.slice(0, 8);

  const SentimentIcon = avgSentiment > 0.15 ? TrendingUp : avgSentiment < -0.15 ? TrendingDown : Minus;
  const sentimentColor = avgSentiment > 0.15 ? "text-green-400" : avgSentiment < -0.15 ? "text-red-400" : "text-slate-400";

  // Incident summary
  const verifiedIncidents = incidentSummary?.verified ?? {
    total: 0,
    critical: 0,
    severity: {},
    incident_type: {},
    provinces: {},
  };

  const unverifiedIncidents = incidentSummary?.unverified ?? {
    total: 0,
    critical: 0,
    severity: {},
  };

  const severityCounts = verifiedIncidents.severity;
  const incidentTypeCounts = verifiedIncidents.incident_type;
  const provinceCounts = verifiedIncidents.provinces;
  const unverifiedSeverityCounts = unverifiedIncidents.severity;

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

      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">News Articles</span>
            <Newspaper className="w-5 h-5 text-information" />
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
          <p className="text-3xl font-bold text-slate-900">{verifiedIncidents.total}</p>
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

      {/* container for left and right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* First Row */}
          {/* Sentiment Distribution */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-slate-900">News Sentiment Distribution</h3>
            </div>
            {totalArticles === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No articles yet. Click "Scrape Latest News" to fetch data in News & Sentiment Feed.</p>
            ) : (
              <div className="space-y-4">
                {(["positive", "negative", "neutral"] as SentimentLabel[]).map((label) => {
                  const count = sentimentCounts[label];
                  const pct = totalArticles > 0 ? (count / totalArticles) * 100 : 0;
                  const color = label === "positive" ? "bg-green-500" : label === "negative" ? "bg-red-500" : "bg-slate-500";
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

          {/* Severity distribution */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-slate-900">Incident Severity Levels</h3>
            </div>
            {verifiedIncidents.total === 0 ? (
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

          {/* Second Row */}
          
            {/* Article Category Breakdown */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-5 h-5 text-primary" />
              <h3 className="font-bold text-slate-900">Article Category Breakdown</h3>
            </div>
            {totalArticles === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No articles yet. Click "Scrape Latest News" to fetch data in News & Sentiment Feed.</p>
            ) : (
              <PieChart
                data={categoryCounts.map((c) => ({ label: c.label, value: c.count, color: c.color }))}
                innerRadiusRatio={0.55}
                showCount={false}
              />
            )}
          </div>

          {/* Incident Type Distribution */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-slate-900">Incident Classification</h3>
            </div>
            {verifiedIncidents.total === 0 ? (
              <p className="text-sm text-slate-400 py-8 text-center">No incidents reported yet.</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(incidentTypeCounts)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const pct =
                      verifiedIncidents.total > 0
                        ? (count / verifiedIncidents.total) * 100
                        : 0;

                    return (
                      <div key={type}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-sm font-medium text-slate-700">
                            {type.replace(/_/g, " ")}
                          </span>

                          <span className="text-sm text-slate-500">
                            {count}
                          </span>
                        </div>

                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>

            )}
          </div>

          {/* Recent articles */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Newspaper className="w-5 h-5 text-information" />
              <h3 className="font-bold text-slate-900">Recent News Articles</h3>
            </div>
            {recentArticles.length === 0 ? (
              <EmptyState title="No verified articles yet" message="Click 'Scrape Latest News' in the News & Sentiment Feed to fetch BARMM election news." />
            ) : (
              <div className="space-y-3">
                {recentArticles.map((article) => (
                  <div key={article.id} className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 line-clamp-2">{article.title}</p>
                      {article.summary && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{article.summary}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-400">{article.source}</span>
                        <span className="text-xs text-slate-300">•</span>
                        <span className="text-xs text-slate-400">{formatDate(article.published_date)}</span>
                        {article.province && (
                          <>
                            <span className="text-xs text-slate-300">•</span>
                            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                              <MapPin className="w-3 h-3" />
                              {article.province}
                            </span>
                          </>
                        )}
                        <SentimentBadge label={article.sentiment_label} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>



          <div className="flex flex-col gap-6">

            {/* Province distribution */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-warning" />
                <h3 className="font-bold text-slate-900">Incidents by Province</h3>
              </div>

              {/* Choropleth Heatmap */}
              <div className="mb-5">
                <ProvinceMap provinceCounts={provinceCounts} />
              </div>

              {/* Existing progress bar distribution */}
              {Object.keys(provinceCounts).length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">No incidents reported yet.</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(provinceCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([province, count]) => {
                      const pct = (count / verifiedIncidents.total) * 100;
                      return (
                        <div key={province}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium text-slate-700">{province}</span>
                            <span className="text-sm text-slate-500">{count}</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Unverified Reports */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <FileWarning className="w-5 h-5 text-warning" />
                  <h3 className="font-bold text-slate-900">Unverified Reports</h3>
                </div>
                {(unverifiedSeverityCounts["critical"] || 0) > 0 && (
                  <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full">
                    {unverifiedSeverityCounts["critical"]} critical
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mb-4">Community-submitted, pending review</p>

              <div className="flex items-center gap-4 rounded-xl bg-amber-50 border border-amber-100 p-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 shrink-0">
                  <FileWarning className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-3xl font-bold text-slate-900 leading-none">
                    {unverifiedIncidents.total}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    {unverifiedIncidents.total === 1 ? "report" : "reports"} awaiting verification
                  </p>
                </div>
              </div>

              {unverifiedIncidents.total > 0 ? (
                <div className="mt-5 pt-5 border-t border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                    Breakdown by severity
                  </p>
                  <PieChart
                    data={SEVERITY_LEVELS.map((sev) => ({
                      label: sev.label,
                      value: unverifiedSeverityCounts[sev.value] || 0,
                      color: sev.color,
                    }))}
                    size={140}
                    innerRadiusRatio={0.6}
                    legendPosition="side"
                  />
                </div>
              ) : (
                <div className="mt-5 pt-5 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-400">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  All reports have been reviewed
                </div>
              )}
            </div>

          </div>



      </div>

    
    </div>
  );
}