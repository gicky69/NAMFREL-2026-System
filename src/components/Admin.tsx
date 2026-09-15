import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from "react-dom";
import { auth } from "@/lib/firebase";
import { supabase } from '@/lib/supabase';
import { UserProfile, Incident, IncidentCategory, NewsSource, NewsArticle} from '@/types';
import { getIdToken } from 'firebase/auth';
import { Users, AlertTriangle, Tags, Globe, Check, X, Plus, MapPin, User, Clock, ExternalLink, FileText, Pencil, RefreshCw } from 'lucide-react';
import { formatDate, formatDateTime } from "@/lib/sentiment";

import EditIncidentModal, {  IncidentReport  } from "./EditIncidentModal";

type TabType = 'users' | 'reports' | 'categories' | 'sources' | 'articles';

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
  const [userTab, setUserTab] = useState<'all' | 'admin' | 'personnel' | 'public' | 'super_admin'>('all');

  const [newCategory, setNewCategory] = useState('');
  const [newSource, setNewSource] = useState('');

  const [editingIncident, setEditingIncident] = useState<IncidentReport | null>(null);

  // Success message states
  const [title, setTitle] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [showStatusPage, setShowStatusPage] = useState(false);
  
  // News Article
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [pendingArticles, setPendingArticles] = useState<NewsArticle[]>([]);
  
  useEffect(() => {
    fetchUsers();
    fetchIncidents();
    fetchCategories();
    fetchSources();
    fecthArticles();
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

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {

      const user = auth.currentUser;
      if (!user){
        throw new Error("Not Authenticated");
      }

      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/api/incidents`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
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

  const fecthArticles = useCallback(async () => { // get all articles with status pending
    try {
      const res = await fetch(`${API_URL}/api/articles?status=pending`);
      if (!res.ok) throw new Error(`Failed to fetch articles with status ${res.status}`);
      const data: NewsArticle[] = await res.json();
      setArticles(data || []);
      setPendingArticles((data || []).filter((a) => a.status === "pending"));
      console.log("Fetched articles:", data);
    } catch (err) {
      console.error("Error fetching articles", err);
    }
    
  }, [API_URL]);

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
      if (!response.ok) throw new Error("Failed to update user");

      const updatedUser = await response.json();
      setUsers((currentUsers) =>
        currentUsers.map((u) =>
          u.id === id ? { ...u, role: updatedUser.role, is_verified: updatedUser.is_verified } : u
        )
      );

      // Show success message
      setTitle("User Role Updated");
      setStatusMessage(`User successfully updated to ${updatedUser.role}.`);
      setShowStatusPage(true);

      // Automatically hide after 3 seconds
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

    } catch (error) {
      console.error("Error updating user:", error);
      setTitle("Error Updating User");
      setStatusMessage(`Failed to update user (${error instanceof Error ? error.message : "unknown error"})`);
      setShowStatusPage(true);
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken();

      const response = await fetch(`${API_URL}/admin/profiles/${id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error("Failed to delete user");

      // Remove the user from the local list
      setUsers((currentUsers) => currentUsers.filter((u) => u.id !== id));

    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  const handleEditReport = (incident: IncidentReport) => {
    // Open the edit modal with the selected incident
    setEditingIncident(incident);
  };

  const handleSaveReport = async (updatedIncident: IncidentReport) => {
    try {
      const user = auth.currentUser;

      if (!user) {
        throw new Error("Not authenticated");
      }

      const token = await user.getIdToken();

      const response = await fetch(
        `${API_URL}/api/incidents/${updatedIncident.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: updatedIncident.title,
            description: updatedIncident.description,
            incident_type: updatedIncident.incident_type,
            category: updatedIncident.category,
            severity: updatedIncident.severity,
            province: updatedIncident.province,
            municipality: updatedIncident.municipality,
            incident_date: updatedIncident.incident_date,
            incident_time: updatedIncident.incident_time,
            organization: updatedIncident.organization,
            contact_info: updatedIncident.contact_info,
            reported_by: updatedIncident.reported_by,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to update report (${response.status}): ${errorText}`
        );
      }

      const updated: Incident = await response.json();

      // Update the incident in the local lists
      setIncidents((prev) =>
        prev.map((incident) =>
          incident.id === updated.id ? updated : incident
        )
      );

      setReports((prev) =>
        prev.map((report) =>
          report.id === updated.id ? updated : report
        )
      );

      setEditingIncident(null);

      setTitle("Report Updated");
      setStatusMessage("Incident report was successfully updated.");
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

    } catch (error) {
      console.error("Error updating report:", error);

      setTitle("Error Updating Report");
      setStatusMessage(
        `Failed to update report (${
          error instanceof Error ? error.message : "unknown error"
        })`
      );
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

      throw error;
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

      setTitle(`Report ${isVerified ? "Verified" : "Rejected"}`);
      setStatusMessage(`Report was successfully ${isVerified ? "verified" : "rejected"}.`);
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

      const updated: Incident = await res.json();
      // Remove it from the pending list, and reflect the new status in the
      // full incidents list too so other tabs/views stay in sync.
      setReports((prev) => prev.filter((r) => r.id !== id));
      setIncidents((prev) => prev.map((i) => (i.id === id ? updated : i)));
    } catch (error) {
      console.error('Error updating report:', error);
      setTitle("Error Updating Report");
      setStatusMessage(`Failed to update report (${error instanceof Error ? error.message : "unknown error"})`);
      setShowStatusPage(true);
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);
      alert("Failed to update report.");
    }
  };

  const handleVerifyArticles = async (id: string, isVerified: boolean) => {
    const newStatus = isVerified ? "verified" : "rejected";
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/api/articles/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error(`Failed to update article (${res.status})`);

      const updated: NewsArticle = await res.json();
      setPendingArticles((prev) => prev.filter((a) => a.id !== id));
      setArticles((prev) => prev.map((a) => (a.id === id ? updated : a)));

      setTitle(isVerified ? "Article Verified" : "Article Rejected");
      setStatusMessage(`Article was successfully ${isVerified ? "verified" : "rejected"}.`);
      setShowStatusPage(true);
      setTimeout(() => setShowStatusPage(false), 3000);
    } catch (error) {
      console.error("Error updating article:", error);
      setTitle(isVerified ? "Error Verifying Article" : "Error Rejecting Article");
      setStatusMessage(`Failed (${error instanceof Error ? error.message : "unknown error"})`);
      setShowStatusPage(true);
      setTimeout(() => setShowStatusPage(false), 3000);
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
        setTitle("Error Adding Category");
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

      setTitle("Category Added");
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
        setTitle("Error Deleting Category");
        setStatusMessage(`Failed to delete category (${response.status})`);
        setShowStatusPage(true);
        setTimeout(() => {
          setShowStatusPage(false);
        }, 3000);

        throw new Error("Failed to delete category");
      }

      // Remove the deleted category from the UI
      setCategories((currentCategories) =>
        currentCategories.filter(
          (category) => category.name !== categoryName
        )
      );
      

      setTitle("Category Deleted");
      setStatusMessage(`"${categoryName}" was successfully deleted.`);
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);

    } catch (error) {
      console.error("Error deleting category:", error);
      setTitle("Error Deleting Category");
      setStatusMessage(`Failed to delete category (${error instanceof Error ? error.message : "unknown error"})`);
      setShowStatusPage(true);
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);
    }
  };
  // #endregion

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
      setTitle("Error Adding Source");
      setStatusMessage(`Failed to add source (${rest.status})`);
      setShowStatusPage(true);
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);
      return
    }

    setTitle("Source Added");
    setStatusMessage(`"${newSourceName}" was successfully added in the list.`);
    setShowStatusPage(true);

    setTimeout(() => {
      setShowStatusPage(false);
    }, 3000);

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

    if (res.ok) {
      await fetchSources();
      setTitle("Source Deleted");
      setStatusMessage(`Source was successfully deleted.`);
      setShowStatusPage(true);

      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);
    } else {
      console.error("Failed to delete source", res.status);
      setTitle("Error Deleting Source");
      setStatusMessage(`Failed to delete source (${res.status})`);
      setShowStatusPage(true);
      setTimeout(() => {
        setShowStatusPage(false);
      }, 3000);
    }
  };

  return (

    <>
    
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <div className="flex min-w-max gap-2">
          {[
            { id: 'users', label: 'User Management', icon: Users },
            { id: 'reports', label: 'Report Verification', icon: AlertTriangle },
            { id: 'categories', label: 'Incident Categories', icon: Tags },
            { id: 'sources', label: 'News Sources', icon: Globe },
            { id: 'articles', label: 'News Verification', icon: FileText },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`flex items-center space-x-2 py-4 px-6 border-b-2 transition-colors whitespace-nowrap ${
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
      </div>

      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
          

        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">User List</h2>

            {/* User Role Tabs */}
            <div className="border-b border-gray-200 mb-6">
              <div className="flex gap-6 overflow-x-auto">
                {[
                  { id: 'all', label: 'All Users' },
                  { id: 'super_admin', label: 'Super Admins' },
                  { id: 'admin', label: 'Administrators' },
                  { id: 'personnel', label: 'Personnel' },
                  { id: 'public', label: 'Public Users' },
                ].map((tab) => {
                  const count =
                    tab.id === 'all'
                      ? users.length
                      : users.filter((user) => user.role === tab.id).length;

                  const isActive = userTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      onClick={() => setUserTab(tab.id as typeof userTab)}
                      className={`pb-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                        isActive
                          ? 'border-primary text-primary'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                      <span
                        className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                          isActive
                            ? 'bg-blue-50 text-primary'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Users List */}
            <div className="divide-y divide-gray-200">
              {users
                .filter((user) => {
                  if (userTab === 'all') return true;
                  return user.role === userTab;
                })
                .map((user) => {
                  const isSuperAdmin = user.role === 'super_admin';

                  return (
                    <div
                      key={user.id}
                      className="py-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      {/* User Information */}
                      <div>
                        <p className="font-medium text-gray-900">
                          {user.full_name || user.email}

                          {isSuperAdmin && (
                            <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold">
                              Super Admin
                            </span>
                          )}
                        </p>

                        <p className="text-xs text-gray-400 mb-2">
                          {user.email}
                        </p>

                        <p className="text-sm text-gray-500">
                          Current Role:{' '}
                          <span className="font-semibold">
                            {user.role}
                          </span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() =>
                            handleVerifyUser(user.id, 'admin')
                          }
                          className="px-4 py-2 bg-purple-50 text-purple-700 rounded-md hover:bg-purple-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={user.role === 'admin' || isSuperAdmin}
                        >
                          Make Admin
                        </button>

                        <button
                          onClick={() =>
                            handleVerifyUser(user.id, 'personnel')
                          }
                          disabled={
                            user.role === 'personnel' || isSuperAdmin
                          }
                          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
                            user.role === 'personnel'
                              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                          }`}
                        >
                          Make Personnel
                        </button>

                        <button
                          onClick={() =>
                            handleVerifyUser(user.id, 'public')
                          }
                          className="px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={user.role === 'public' || isSuperAdmin}
                        >
                          Make Public
                        </button>

                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="px-4 py-2 bg-red-50 text-red-700 rounded-md hover:bg-red-100 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={isSuperAdmin}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}

              {/* Empty State */}
              {users.filter((user) => {
                if (userTab === 'all') return true;
                return user.role === userTab;
              }).length === 0 && (
                <div className="py-12 text-center text-sm text-gray-400">
                  No users in this category.
                </div>
              )}
            </div>
          </div>
        )}


        {activeTab === 'reports' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Unverified Incident Reports</h2>
              <span className="text-sm text-gray-500">
                {reports.length} pending report{reports.length !== 1 ? 's' : ''}
              </span>
            </div>
            {loading && <p className="text-gray-500 py-4">Loading reports...</p>}
            {error && <p className="text-red-600 py-4">{error}</p>}
            
            <div className="space-y-6">
              {!loading && reports.length === 0 && (
                <p className="text-gray-500 py-4 border-2 border-dashed border-gray-200 rounded-lg text-center bg-gray-50">No pending reports to verify.</p>
              )}
              
              {reports.map((report) => (
                <div key={report.id} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col gap-5 transition hover:shadow-md">
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900 leading-tight">{report.title}</h3>
                          <p className="text-sm text-gray-500 mt-1 flex items-center gap-2">
                            <Clock size={14} /> 
                              {formatDate(report.incident_date)}
                              {report.incident_time ? ` at ${report.incident_time}` : ""}
                          </p>
                        </div>
                        
                        {/* Status Badges */}
                        <div className="flex gap-2">
                          <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize border ${
                            report.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-200' :
                            report.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {report.severity}
                          </span>
                          {report.sentiment_label && report.sentiment_label !== 'neutral' && (
                            <span className={`px-2.5 py-1 text-xs rounded-full font-medium capitalize border ${
                              report.sentiment_label === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              AI: {report.sentiment_label}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
                        {report.description}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2 shrink-0 md:w-32">
                      <button 
                        className="edit-button text-sm flex-1 flex items-center justify-center bg-gray-100 hover:bg-gray-200 space-x-1 px-3 py-2 text-primary rounded-md transition-colors shadow-sm"
                        onClick={() => handleEditReport(report)}
                      >
                        
                        <Pencil size={16} /> <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleVerifyReport(report.id, true)}
                        className="text-sm flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                      >
                        <Check size={16} />
                        <span className="font-medium">Verify</span>
                      </button>
                      <button
                        onClick={() => handleVerifyReport(report.id, false)}
                        className="text-sm flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors shadow-sm"
                      >
                        <X size={16} />
                        <span className="font-medium">Reject</span>
                      </button>
                    </div>
                  </div>

                  {/* Verification Context Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 border-t border-gray-100 pt-4 mt-2">
                    
                    {/* Location Block */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1"><MapPin size={12}/> General Location</p>
                      <p className="text-sm font-medium text-gray-900">{report.province}</p>
                      {report.municipality && <p className="text-xs text-gray-500">{report.municipality}</p>}
                    </div>

                    {/* Reporter Details Block */}
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1"><User size={12}/> Reporter Credentials</p>
                      <p className="text-sm font-medium text-gray-900">{report.organization || report.reported_by || "Anonymous Public User"}</p>
                      {report.contact_info && <p className="text-xs text-gray-500">Contact: {report.contact_info}</p>}
                      {report.reporter_ip && <p className="text-xs text-gray-400 font-mono mt-1">IP: {report.reporter_ip}</p>}
                    </div>

                    {/* Geolocation Block */}
                    <div className="space-y-1 lg:col-span-1 md:col-span-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1"><Globe size={12}/> Exact Geolocation</p>
                      {report.reporter_latitude && report.reporter_longitude ? (
                        <div className="bg-blue-50 border border-blue-100 rounded p-2 mt-1">
                          <div className="flex justify-between items-center">
                            <div className="text-xs text-blue-800 font-mono">
                              <div>Lat: {report.reporter_latitude.toFixed(5)}</div>
                              <div>Lng: {report.reporter_longitude.toFixed(5)}</div>
                              {report.reporter_location_accuracy && <div className="text-blue-600/70 mt-0.5">±{Math.round(report.reporter_location_accuracy)} meters</div>}
                            </div>
                            <a 
                              href={`https://www.google.com/maps/search/?api=1&query=${report.reporter_latitude},${report.reporter_longitude}`} 
                              target="_blank" 
                              rel="noreferrer"
                              className="flex items-center gap-1 text-xs bg-blue-600 text-white px-2 py-1.5 rounded hover:bg-blue-700 transition"
                            >
                              Maps <ExternalLink size={12} />
                            </a>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic mt-1">No GPS coordinates provided</p>
                      )}
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'categories' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Manage Incident Categories</h2>
            <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-3 mb-6">
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="New category name..."
                className="w-full flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
              <button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
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

        {activeTab === 'articles' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Unverified News Articles</h2>
              
              <span className="text-sm text-gray-500">
                {pendingArticles.length} pending article{pendingArticles.length !== 1 ? 's' : ''}
              </span>
            </div>

            <div className="space-y-6">
              {pendingArticles.length === 0 && (
                <p className="text-gray-500 py-4 border-2 border-dashed border-gray-200 rounded-lg text-center bg-gray-50">
                  No pending articles to verify.
                </p>
              )}

              {pendingArticles.map((article) => (
                <div key={article.id} className="p-5 border border-gray-200 rounded-xl bg-white shadow-sm flex flex-col gap-4 transition hover:shadow-md">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-lg text-gray-900 leading-tight">{article.title}</h3>
                      <p className="text-sm text-gray-500 flex items-center gap-2">
                        <Clock size={14} />
                        {formatDateTime(article.published_date)}
                        {article.source && <span className="ml-2">· {article.source}</span>}
                      </p>
                      {article.summary && (
                        <p className="text-gray-700 text-sm bg-gray-50 p-3 rounded-md border border-gray-100">
                          {article.summary}
                        </p>
                      )}
                      {article.url && (
                        <a
                          href={article.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
                        >
                          View original <ExternalLink size={12} />
                        </a>
                      )}
                      {article.sentiment_label && (
                        <span className={`inline-block ml-2 px-2.5 py-1 text-xs rounded-full font-medium capitalize border ${
                          article.sentiment_label === 'negative' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          article.sentiment_label === 'positive' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-gray-50 text-gray-600 border-gray-200'
                        }`}>
                          AI: {article.sentiment_label}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2 shrink-0 md:w-32">
                      <button
                        onClick={() => handleVerifyArticles(article.id, true)}
                        className="text-sm flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors shadow-sm"
                      >
                        <Check size={16} />
                        <span className="font-medium">Verify</span>
                      </button>
                      <button
                        onClick={() => handleVerifyArticles(article.id, false)}
                        className="text-sm flex-1 flex items-center justify-center space-x-1 px-3 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-colors shadow-sm"
                      >
                        <X size={16} />
                        <span className="font-medium">Reject</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'sources' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Scraper News Sources</h2>
            <form onSubmit={handleAddSource} className="flex flex-col sm:flex-row gap-3 mb-6">
            <input
              type="text"
              value={newSourceName}
              onChange={(e) => setNewSourceName(e.target.value)}
              placeholder="Source name"
              className="w-full sm:w-1/3 rounded-md border-gray-300 shadow-sm border p-2"
            />
            <input
              type="url"
              value={newSourceURL}
              onChange={(e) => setNewSourceURL(e.target.value)}
              placeholder="https://example-news.com/feed"
              className="w-full flex-1 rounded-md border-gray-300 shadow-sm border p-2"
            />
            <button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark">
              <Plus size={20} />
              <span>Add Source</span>
            </button>
          </form>
            <ul className="divide-y divide-gray-200">
              {sources.map((source) => (
                <li key={source.id} className="py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-gray-700">
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">{source.name}</span>
                    <span className="text-xs text-gray-500 break-all">{source.url}</span>
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
                {title}
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

      {editingIncident && (
        <EditIncidentModal
          incident={editingIncident}
          isOpen={editingIncident !== null}
          onClose={() => setEditingIncident(null)}
          onSave={handleSaveReport}
        />
      )}

    </>
  );
}