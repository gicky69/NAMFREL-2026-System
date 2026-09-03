import { useState, useEffect, useCallback } from "react";
import { Newspaper, LayoutDashboard, FileWarning, AlertTriangle, Menu, X } from "lucide-react";
import Dashboard from "@/components/Dashboard";
import NewsFeed from "@/components/NewsFeed";
import ReportIncident from "@/components/ReportIncident";
import IncidentsList from "@/components/IncidentsList";

type Page = "dashboard" | "news" | "report" | "incidents";

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "news", label: "News & Sentiment", icon: Newspaper },
  { id: "report", label: "Report Incident", icon: FileWarning },
  { id: "incidents", label: "Incident Reports", icon: AlertTriangle },
];

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const navigate = useCallback((p: Page) => {
    setPage(p);
    setMobileMenuOpen(false);
  }, []);

  const triggerRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-teal-800 text-white sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center ring-2 ring-teal-400/30">
                <Newspaper className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold leading-tight">BARMM Election Monitor</h1>
                <p className="text-xs text-teal-200 hidden sm:block">Sentiment Analysis & Incident Reporting</p>
              </div>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      page === item.id
                        ? "bg-teal-600 text-white shadow-sm"
                        : "text-teal-100 hover:bg-teal-700 hover:text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-teal-700 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-teal-800 border-t border-teal-700 animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      page === item.id
                        ? "bg-teal-600 text-white"
                        : "text-teal-100 hover:bg-teal-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div key={page} className="animate-fade-in">
          {page === "dashboard" && <Dashboard key={`dash-${refreshKey}`} />}
          {page === "news" && <NewsFeed key={`news-${refreshKey}`} />}
          {page === "report" && <ReportIncident onSubmitted={triggerRefresh} />}
          {page === "incidents" && <IncidentsList key={`inc-${refreshKey}`} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>BARMM Election Monitor — Bangsamoro Autonomous Region in Muslim Mindanao</p>
          <p className="text-xs mt-1 text-slate-500">Community-driven election monitoring platform</p>
        </div>
      </footer>
    </div>
  );
}
