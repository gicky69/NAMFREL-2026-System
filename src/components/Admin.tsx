import React, { useState, useEffect, useCallback } from 'react';
import { Users, AlertTriangle, Tags, Globe, Check, X, Plus } from 'lucide-react';
import { auth } from "@/lib/firebase";
import { supabase } from '@/lib/supabase';
import { UserProfile, Incident, IncidentCategory, NewsSource } from '@/types';
import { getIdToken } from 'firebase/auth';

import { createPortal } from "react-dom";


type TabType = 'users' | 'reports' | 'categories' | 'sources';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  const API_URL = import.meta.env.VITE_API_URL;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Incident[]>([]);
  const [categories, setCategories] = useState<IncidentCategory[]>([]);
  const [sources, setSources] = useState<NewsSource[]>([]);
  const [newSourceName, setNewSourceName] = useState("");
  const [newSourceURL, setNewSourceURL] = useState("");

  const [newCategory, setNewCategory] = useState('');
  const [newSource, setNewSource] = useState('');

  const [statusMessage, setStatusMessage] = useState("");
  const [showStatusPage, setShowStatusPage] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchIncidents();
    fetchCategories();
    fetchSources();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_URL}/admin/profiles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Fetches all incidents, and derives `reports` as just the ones still
  // awaiting a decision -- the "Report Verification" tab reads from
  // `reports`, not `incidents` directly, so both need to be set here.
  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/incidents?limit=100`);
      if (!res.ok) throw new Error(`Failed to fetch incidents (${res.status})`);
      const data: Incident[] = await res.json();
      setIncidents(data || []);
      setReports((data || []).filter((i) => i.status === "reported"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch incidents");
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  const fetchCategories = async () => {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_URL}/admin/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchSources = useCallback(async () => {
    const res = await fetch(`${API_URL}/api/sources`);
    if (res.ok) setSources(await res.json());
  }, []);

  const handleVerifyUser = async (id: string, newRole: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/admin/profiles/${id}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole, is_verified: true }),
      });
      if (!response.ok) {
        setStatusMessage(`Failed to update user (${response.status})`);
        setShowStatusPage(true);

        setTimeout(() => {
          setShowStatusPage(false);
        }, 3000);

        throw new Error("Failed to update user");
      }

      const updatedUser = await response.json();
      setUsers((currentUsers) =>
        currentUsers.map((u) =>
          u.id === id ? { ...u, role: updatedUser.role, is_verified: updatedUser.is_verified } : u
        )
      );

      // Show success message
      setStatusMessage(`User successfully updated to ${updatedUser.role}.`);
      setShowStatusPage(true);

      // Automatically hide after 3 seconds
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    }
  };

  // Routed through our FastAPI backend (PATCH /api/incidents/{id}/status)
  // instead of a direct Supabase update, so verified_at gets set
  // consistently and this stays the one place auth checks get added later.
  const handleVerifyReport = async (id: string, isVerified: boolean) => {
    const newStatus = isVerified ? 'verified' : 'rejected';
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/incidents/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, 
         },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to update report (${res.status})`);

      const updated: Incident = await res.json();
      // Remove it from the pending list, and reflect the new status in the
      // full incidents list too so other tabs/views stay in sync.
      setReports((prev) => prev.filter((r) => r.id !== id));
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (error) {
      console.error('Error updating report:', error);
      alert("Failed to update report.");
    }
  };

  // #region Incident Categories tab handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) return;

    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_URL}/admin/categories`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategory }),
      });
      if (!response.ok) {
        setStatusMessage(`Failed to add category (${response.status})`);
        setShowStatusPage(true);
        setTimeout(() => {
          setShowStatusPage(false);
        }, 3000);
        throw new Error("Failed to add category");
      } 

      const addedCategory = await response.json();
      setCategories([...categories, addedCategory]);
      setNewCategory('');

      setStatusMessage(`"${addedCategory.name}" was successfully added in the list.`);
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);


    } catch (error) {
      console.error("Error adding category:", error);
    }
  };

  const handleDeleteCategory = async (categoryName: string) => {
    try {
      const token = await auth.currentUser?.getIdToken();

      const response = await fetch(
        `${API_URL}/admin/categories/${encodeURIComponent(categoryName)}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete category");
      }

      // Remove the deleted category from the UI
      setCategories((currentCategories) =>
        currentCategories.filter(
          (category) => category.name !== categoryName
        )
      );
      

      setStatusMessage(`"${categoryName}" was successfully deleted.`);
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

    } catch (error) {
      console.error("Error deleting category:", error);
      alert("Failed to delete category.");
    }
  };
  // #endregion

  // #region News Sources tab handlers
  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource) return;

    const { data, error } = await supabase
      .from('news_sources')
      .insert([{ name: new URL(newSource).hostname, url: newSource }])
      .select();

    if (!error && data) {
      setSources([...sources, data[0]]);
      setNewSource('');
    } else {
      console.error('Error adding source:', error);
    }
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    const { error } = await supabase
      .from('incident_categories')
      .delete()
      .eq('name', categoryToDelete);

    if (!error) {
      setCategories(categories.filter((cat) => cat.name !== categoryToDelete));
    } else {
      console.error('Error deleting category:', error);
    }
  };

  const handleAddSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSourceName || !newSourceURL) return;
    const token = await auth.currentUser?.getIdToken();
    const rest = await fetch(`${API_URL}/api/sources`, {
      method: "POST",
      headers: {
        "Content-type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: newSourceName, url: newSourceURL}),
    });
    if (!rest.ok) {
      console.error("Failed to add source", rest.status);
      return
    }

    setNewSourceName("");
    setNewSourceURL("");
    await fetchSources();
  };
  const handleDeleteSource = async (id: string) => {
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(`${API_URL}/api/sources/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}`},
    });

    if (res.ok) await fetchSources();
  };

  // #endregion

  return (

    <>
    
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="flex space-x-4 border-b border-gray-200 mb-6">
        {[
          { id: 'users', label: 'User Verification', icon: Users },
          { id: 'reports', label: 'Report Verification', icon: AlertTriangle },
          { id: 'categories', label: 'Incident Categories', icon: Tags },
          { id: 'sources', label: 'News Sources', icon: Globe },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center space-x-2 py-4 px-6 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon size={20} />
            <span className="font-medium">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">User Management</h2>
            <div className="divide-y divide-gray-200">
              {users.map((user) => {
                const isSuperAdmin = user.role === 'super_admin';
                
                return (
                  <div key={user.id} className="py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">
                        {user.full_name || user.email} {isSuperAdmin && <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">Super Admin</span>}
                      </p>
                      <p className="text-sm text-gray-500">Current Role: <span className="font-semibold">{user.role}</span></p>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleVerifyUser(user.id, 'admin')}
                        className="px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={user.role === 'admin' || isSuperAdmin}
                      >
                        Make Admin
                      </button>
                      
                      <button 
                        onClick={() => handleVerifyUser(user.id, 'personnel')}
                        disabled={user.role === 'personnel' || isSuperAdmin}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                          user.role === 'personnel' || isSuperAdmin
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                        }`}
                      >
                        Make Personnel
                      </button>
                      
                      <button 
                        onClick={() => handleVerifyUser(user.id, 'public')}
                        className="px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={user.role === 'public' || isSuperAdmin}
                      >
                        Make Public
                      </button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {/* NEW: Make Admin But ton */}
                    <button 
                      onClick={() => handleVerifyUser(user.id, 'admin')}
                      className="px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={user.role === 'admin'}
                    >
                      Make Admin
                    </button>
                    
                    <button 
                      onClick={() => handleVerifyUser(user.id, 'personnel')}
                      disabled={user.role === 'personnel'}
                      className={`px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
                      user.role === 'personnel'
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                    }`}
                    >
                      Make Personnel
                    </button>
                    
                    <button 
                      onClick={() => handleVerifyUser(user.id, 'public')}
                      className="px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={user.role === 'public'}
                    >
                      Make Public
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Unverified Incident Reports</h2>
            {loading && <p className="text-gray-500 py-4">Loading reports...</p>}
            {error && <p className="text-red-600 py-4">{error}</p>}
            <div className="divide-y divide-gray-200">
              {!loading && reports.length === 0 && <p className="text-gray-500 py-4">No pending reports.</p>}
              {reports.map((report) => (
                <div key={report.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{report.title}</p>
                    <p className="text-sm text-gray-500">{report.province} {report.municipality && `- ${report.municipality}`}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleVerifyReport(report.id, true)}
                      className="flex items-center space-x-1 px-3 py-2 bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                    >
                      <Check size={16} />
                      <span>Verify</span>
                    </button>
                    <button
                      onClick={() => handleVerifyReport(report.id, false)}
                      className="flex items-center space-x-1 px-3 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100"
                    >
                      <X size={16} />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Manage Incident Categories</h2>
            <form onSubmit={handleAddCategory} className="flex space-x-4 mb-6">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
              <button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus size={20} />
                <span>Add Category</span>
              </button>
            </form>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat, idx) => (
                <div key={idx} className="flex items-center space-x-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium border border-gray-200">
                  <span>{cat.name}</span>
                  <button
                    onClick={() => handleDeleteCategory(cat.name)}
                    className="ml-1 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Scraper News Sources</h2>
            <form onSubmit={handleAddSource} className="flex space-x-4 mb-6">
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Source name"
              className="w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
            <input
              type="url"
              value={newSourceURL}
              onChange={(e) => setNewSourceURL(e.target.value)}
              placeholder="https://example-news.com/feed"
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
            />
            <button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus size={20} />
              <span>Add Source</span>
            </button>
          </form>
            <ul className="divide-y divide-gray-200">
              {sources.map((source) => (
                <li key={source.id} className="py-3 flex items-center justify-between text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{source.name}</span>
                    <span className="text-xs text-gray-500">{source.url}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteSource(source.id)}
                    className="text-red-500 hover:text-red-700 font-medium text-sm"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>

      {showStatusPage &&
      createPortal(
        <div className="fixed bottom-6 right-6 z-[999999]">
          <div className="flex items-center gap-4 rounded-xl border border-green-200 bg-white px-5 py-4 shadow-2xl min-w-[400px]">

            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Check className="h-6 w-6 text-green-600" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Success!
              </h3>

              <p className="text-sm text-slate-500">
                {statusMessage}
              </p>
            </div>

            <button
              onClick={() => setShowStatusPage(false)}
              className="text-slate-400 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}