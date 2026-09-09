import { useState, useEffect, useCallback } from "react";
import { Newspaper, LayoutDashboard, FileWarning, AlertTriangle, Menu, X } from "lucide-react";
import { CircleUser, ChevronDown, User, LogOut } from "lucide-react";
import Dashboard from "@/components/Dashboard";
import NewsFeed from "@/components/NewsFeed";
import ReportIncident from "@/components/ReportIncident";
import IncidentsList from "@/components/IncidentsList";
import logo from "@/assets/apc-logo.png";
import Admin from "@/components/Admin";

type Page = "dashboard" | "news" | "report" | "incidents" | "admin";

const NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "news", label: "News & Sentiment", icon: Newspaper },
  { id: "report", label: "Report Incident", icon: FileWarning },
  { id: "incidents", label: "Incident Reports", icon: AlertTriangle },
  { id: "admin", label: "Admin", icon: LayoutDashboard }
];

export default function AuthenticatedApp() {
  const [page, setPage] = useState<Page>("dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false); // for user profile dropdown
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
      <header className="header bg-primary text-white sticky top-0 z-50 shadow-lg h-20">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              {/* Logo */}
              <div className="w-12 h-12">
                <img src={logo} alt="Logo" className="w-12 h-12" />
              </div>

              {/* Title */}
              <div>
                <h1 className="text-xl text-white font-bold leading-tight">Incident Reporting & Sentiment Analysis</h1>
                <p className="text-xs text-white font-bold hidden sm:block">BARMM 2026 Elections</p>
              </div>
            </div>

            {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-3">

            {/* Desktop Navigation */}
            <nav className="flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`nav-item flex items-center gap-1 px-3 py-1 rounded-lg text-base font-medium ${
                      page === item.id ? "active text-white" : "text-white"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            {/* User Dropdown */}
            <div className="relative">

              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-1 p-2 rounded-lg hover:bg-primary-dark transition-all duration-200"
              >
                <CircleUser className="w-6 h-6" />
                <ChevronDown className="w-4 h-4" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden text-slate-700 z-50">

                  {/* Profile */}
                  <button
                    onClick={() => {
                      navigate("profile");
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-slate-100 transition-colors"
                  >
                    <User className="w-4 h-4" />
                    Profile
                  </button>

                  <div className="border-t border-slate-200" />

                  {/* Logout */}
                  <button
                    onClick={() => {
                      navigate("logout");
                      setUserMenuOpen(false);
                    }}
                    className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>

                </div>
              )}

            </div>

          </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-primary-dark transition-all duration-200"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-primary border-t border-primary-dark animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      page === item.id
                        ? "bg-primary-dark text-white"
                        : "text-white hover:bg-primary-dark hover:text-white"
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
          {page === "admin" && <Admin key={`admin-${refreshKey}`} />}
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
