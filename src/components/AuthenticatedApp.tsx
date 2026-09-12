import { useState, useEffect, useCallback } from "react";
import { Newspaper, LayoutDashboard, FileWarning, AlertTriangle, Menu, X } from "lucide-react";
import { CircleUser, ChevronDown, User, LogOut } from "lucide-react";

import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";

import Dashboard from "@/components/Dashboard";
import NewsFeed from "@/components/NewsFeed";
import ReportIncident from "@/components/ReportIncident";
import IncidentsList from "@/components/IncidentsList";
import logo from "@/assets/web-logo.png";
import Admin from "@/components/Admin";

type Page = "dashboard" | "news" | "report" | "incidents" | "admin";

const ALL_NAV_ITEMS: { id: Page; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "news", label: "News & Sentiment", icon: Newspaper },
  { id: "report", label: "Report Incident", icon: FileWarning },
  { id: "incidents", label: "Incident Reports", icon: AlertTriangle },
  { id: "admin", label: "Admin", icon: LayoutDashboard }
];

type Profile = {
  email: string;
  full_name: string | null;
  role: string;
  is_verified: boolean;
};

type Props = {
  profile: Profile;
  onLogout: () => void;
};

export default function AuthenticatedApp({ profile, onLogout }: Props) {
  const handleLogout = async () => {
    try {
      await signOut(auth);
      console.log("User logged out successfully");
      onLogout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  // Determine allowed navigation items based on role
  const isRestrictedRole = profile.role === "public" || profile.role === "personnel";
  
  const navItems = isRestrictedRole
    ? ALL_NAV_ITEMS.filter((item) => item.id === "report")
    : ALL_NAV_ITEMS.filter((item) => item.id !== "admin" || profile.role === "admin" || profile.role === "super_admin");

  // Default page should be "report" for restricted users, otherwise "dashboard"
  const [page, setPage] = useState<Page>(isRestrictedRole ? "report" : "dashboard");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);  

  // Force redirect if a restricted user somehow lands on an unallowed page
  useEffect(() => {
    if (isRestrictedRole && page !== "report") {
      setPage("report");
    }
  }, [isRestrictedRole, page]);

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
      <header className="relative bg-primary text-white sticky top-0 z-50 shadow-lg">

        {/* Main Header */}
        <div className="h-20 bg-primary">
          <div className="max-w-8xl mx-auto h-full">

            <div className="flex items-center justify-end h-full px-4 sm:justify-between sm:pl-56 sm:pr-6 lg:pr-8">

              {/* Title */}
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold leading-tight">
                  Incident Reporting & Sentiment Analysis
                </h1>

                <p className="text-xs font-bold hidden sm:block text-white/90">
                  BARMM 2026 Elections
                </p>
              </div>

              {/* Desktop Nav */}
              <div className="hidden md:flex items-center gap-3">
                <nav className="flex items-center gap-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={`nav-item flex items-center gap-1 px-3 py-1 rounded-lg text-base font-medium ${
                          page === item.id
                            ? "active text-white"
                            : "text-white"
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

                      <div className="border-t border-slate-200" />

                      <button
                        onClick={() => {
                          handleLogout();
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

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg hover:bg-primary-dark"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen
                  ? <X className="w-5 h-5" />
                  : <Menu className="w-5 h-5" />
                }
              </button>

            </div>
          </div>
        </div>

        {/* red Line */}
        <div className="h-1.5 bg-red-500" />

        {/* logo panel container*/}
        <div className="absolute top-0 left-0 z-30">
          
          {/* shadow */}
          <div className="drop-shadow-xl">
            
            {/* actual logo panel */}
            <div
              className="
                w-44
                sm:w-52
                h-24
                sm:h-28
                bg-white
                flex
                items-center
                justify-center
              "
              style={{
                clipPath: "polygon(0 0, 100% 0, 86% 100%, 0 100%)"
              }}
            >
              <img
                src={logo}
                alt="School of Engineering"
                className="w-[170px] sm:w-[200px] h-auto object-contain mr-5"
              />
            </div>

          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="md:hidden bg-primary border-t border-primary-dark animate-fade-in relative z-20">
            <div className="px-4 py-3 space-y-1">

              {/* Navigation Items */}
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      page === item.id
                        ? "bg-primary-dark text-white"
                        : "text-white hover:bg-primary-dark"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}

              {/* Divider */}
              <div className="border-t border-white/20 my-2" />

              {/* Logout */}
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-sm font-medium text-red-200 hover:bg-red-500/20 hover:text-red-100 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>

            </div>
          </nav>
        )}

      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div key={page} className="animate-fade-in">
          {page === "dashboard" && !isRestrictedRole && <Dashboard key={`dash-${refreshKey}`} />}
          {page === "news" && !isRestrictedRole && <NewsFeed key={`news-${refreshKey}`} />}
          {page === "report" && <ReportIncident onSubmitted={triggerRefresh} />}
          {page === "incidents" && !isRestrictedRole && <IncidentsList key={`inc-${refreshKey}`} />}
          {page === "admin" && !isRestrictedRole && <Admin key={`admin-${refreshKey}`} />}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-400 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-sm">
          <p>BARMM Election Monitor — Bangsamoro Autonomous Region in Muslim Mindanao</p>
          <p className="text-xs mt-1 text-slate-500">By Team AI - Asia Pacific College - 2026</p>
        </div>
      </footer>
    </div>
  );
}