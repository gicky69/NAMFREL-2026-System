import React, { useState } from 'react';
import { Users, AlertTriangle, Tags, Globe, Check, X, Plus } from 'lucide-react';

type TabType = 'users' | 'reports' | 'categories' | 'sources';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Placeholder states (Replace with actual data fetching from Supabase/FastAPI)
  const [users] = useState([
    { id: '1', name: 'Ahmad M.', role: 'public', status: 'pending' },
    { id: '2', name: 'Fatima R.', role: 'personnel', status: 'verified' },
  ]);
  
  const [reports] = useState([
    { id: '101', title: 'Vote Buying Allegation', location: 'Marawi City', status: 'pending_verification' },
    { id: '102', title: 'Intimidation at Polling Precinct', location: 'Cotabato City', status: 'pending_verification' },
  ]);

  const [categories, setCategories] = useState(['Violence', 'Vote Buying', 'Machine Malfunction']);
  const [newCategory, setNewCategory] = useState('');

  const [sources, setSources] = useState(['https://mindanaonews.com', 'https://barmm.gov.ph/news']);
  const [newSource, setNewSource] = useState('');

  // --- Handlers (Wire these to your backend/Supabase) ---
  const handleVerifyUser = (id: string, newRole: string) => {
    console.log(`Verify user ${id} as ${newRole}`);
    // API Call: Update user profile role and status
  };

  const handleVerifyReport = (id: string, isVerified: boolean) => {
    console.log(`Report ${id} verification: ${isVerified}`);
    // API Call: Update incident status to 'verified' or 'rejected'
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory) return;
    setCategories([...categories, newCategory]);
    setNewCategory('');
    // API Call: Insert into incident_categories table
  };

  const handleDeleteCategory = (categoryToDelete: string) => {
    setCategories(categories.filter((cat) => cat !== categoryToDelete));
    // API Call: Delete from incident_categories table
  };

  const handleAddSource = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource) return;
    setSources([...sources, newSource]);
    setNewSource('');
    // API Call: Insert into news_sources table
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Admin Dashboard</h1>

      {/* Navigation Tabs */}
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

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-100">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Pending User Verifications</h2>
            <div className="divide-y divide-gray-200">
              {users.map((user) => (
                <div key={user.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">Current Role: {user.role}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => handleVerifyUser(user.id, 'personnel')}
                      className="px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 text-sm font-medium"
                    >
                      Approve as Personnel
                    </button>
                    <button 
                      onClick={() => handleVerifyUser(user.id, 'public')}
                      className="px-4 py-2 bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS TAB */}
        {activeTab === 'reports' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Unverified Incident Reports</h2>
            <div className="divide-y divide-gray-200">
              {reports.map((report) => (
                <div key={report.id} className="py-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{report.title}</p>
                    <p className="text-sm text-gray-500">{report.location}</p>
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

        {/* CATEGORIES TAB */}
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
                  <span>{cat}</span>
                  <button 
                    onClick={() => handleDeleteCategory(cat)}
                    className="ml-1 text-gray-400 hover:text-red-500 transition-colors focus:outline-none"
                    aria-label={`Delete ${cat}`}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SOURCES TAB */}
        {activeTab === 'sources' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Scraper News Sources</h2>
            <form onSubmit={handleAddSource} className="flex space-x-4 mb-6">
              <input
                type="url"
                value={newSource}
                onChange={(e) => setNewSource(e.target.value)}
                placeholder="https://example-news.com/feed"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
              />
              <button type="submit" className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                <Plus size={20} />
                <span>Add Source</span>
              </button>
            </form>
            <ul className="divide-y divide-gray-200">
              {sources.map((source, idx) => (
                <li key={idx} className="py-3 flex items-center justify-between text-gray-700">
                  <span>{source}</span>
                  <button className="text-red-500 hover:text-red-700 font-medium text-sm">Remove</button>
                </li>
              ))}
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}