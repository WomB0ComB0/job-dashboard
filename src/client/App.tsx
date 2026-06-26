import {
    BarChart2,
    Briefcase,
    CheckCircle,
    ExternalLink,
    LogOut,
    RefreshCw,
    Settings,
    Star,
    Trash2,
    XCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import api, { authApi } from './api';

type TypeStyle = { label: string; bar: string; text: string; chip: string };

// Semantic colors for each employment type, shared by the badges, filter, and charts.
const TYPE_META: Record<string, TypeStyle> = {
  'full-time': {
    label: 'Full-time',
    bar: 'bg-emerald-500',
    text: 'text-emerald-400',
    chip: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
  },
  contract: {
    label: 'Contract',
    bar: 'bg-amber-500',
    text: 'text-amber-400',
    chip: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  },
  internship: {
    label: 'Internship',
    bar: 'bg-sky-500',
    text: 'text-sky-400',
    chip: 'bg-sky-500/15 text-sky-300 border border-sky-500/30',
  },
  unknown: {
    label: 'Unknown',
    bar: 'bg-slate-600',
    text: 'text-slate-400',
    chip: 'bg-slate-700/40 text-slate-400 border border-slate-600/40',
  },
};

const typeStyle = (type: string): TypeStyle => TYPE_META[type] ?? TYPE_META.unknown!;

function App() {
  const [user, setUser] = useState<{ username: string } | null>(() => {
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [view, setView] = useState<'jobs' | 'settings' | 'stats'>('jobs');
  const [jobs, setJobs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [prefs, setPrefs] = useState<{
    accepted_titles: string[],
    rejected_titles: string[],
    accepted_locations: string[],
    rejected_locations: string[],
    employment_types: string[],
    disciplines: string[]
  }>({
    accepted_titles: [],
    rejected_titles: [],
    accepted_locations: [],
    rejected_locations: [],
    employment_types: [],
    disciplines: []
  });
  const [suggestedKeywords, setSuggestedKeywords] = useState<{ keyword: string, count: number }[]>([]);
  const [suggestedLocations, setSuggestedLocations] = useState<{ location: string, count: number }[]>([]);
  const [suggestedDisciplines, setSuggestedDisciplines] = useState<{ discipline: string, label: string, count: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'signup'>('login');
  const [authForm, setAuthForm] = useState({ username: '', password: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (token) {
      fetchData();
    }
  }, [token, view, page, statusFilter, typeFilter, timeFilter, searchQuery]);

  const fetchData = async () => {
    try {
      if (view === 'jobs') {
        const res = await api.get(`/jobs?page=${page}&status=${statusFilter}&type=${typeFilter}&time=${timeFilter}&search=${searchQuery}`);
        setJobs(res.data.jobs);
        setTotalPages(res.data.totalPages);
        setTotalJobs(res.data.total);
      } else if (view === 'stats') {
        const res = await api.get('/stats');
        setStats(res.data);
      } else if (view === 'settings') {
        const res = await api.get('/preferences');
        setPrefs(res.data);
        const keywordsRes = await api.get('/keywords');
        setSuggestedKeywords(keywordsRes.data.keywords);
        const locationsRes = await api.get('/locations');
        setSuggestedLocations(locationsRes.data.locations);
        const disciplinesRes = await api.get('/disciplines');
        setSuggestedDisciplines(disciplinesRes.data.disciplines);
      }
    } catch (e) {
      console.error(e);
      if ((e as any).response?.status === 401) handleLogout();
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (authView === 'login') {
        const res = await authApi.post('/login', authForm);
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
      } else {
        await authApi.post('/signup', authForm);
        setAuthView('login');
        alert('Signup successful! Please login.');
      }
    } catch (e: any) {
      alert(e.response?.data?.error || 'Auth failed');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const handleStatusUpdate = async (id: number, status: string) => {
    await api.patch(`/jobs/${id}/status`, { status });
    setJobs(jobs.map(j => j.id === id ? { ...j, status } : j));
  };

  const handleFavoriteToggle = async (id: number, isFavorite: boolean) => {
    await api.patch(`/jobs/${id}/favorite`, { is_favorite: isFavorite });
    
    setJobs(prevJobs => prevJobs.map(j => j.id === id ? { ...j, is_favorite: isFavorite } : j));
    
    // If we are filtering by favorites and unfavorite the item, remove it immediately from view
    if (statusFilter === 'favorites' && !isFavorite) {
       setJobs(prevJobs => prevJobs.filter(j => j.id !== id));
    }
  };

  const handleScrape = async () => {
    setLoading(true);
    try {
      await api.post('/jobs/scrape');
      await fetchData();
    } finally {
      setLoading(false);
    }
  };

  const updatePrefs = async (newPrefs: any) => {
    await api.patch('/preferences', newPrefs);
    setPrefs(newPrefs);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="bg-indigo-600 p-3 rounded-xl">
              <Briefcase className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white text-center mb-2">Job Dashboard</h1>
          <p className="text-slate-400 text-center mb-8">Manage your internship search effectively</p>
          
          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Username</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={authForm.username}
                onChange={e => setAuthForm({ ...authForm, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Password</label>
              <input
                type="password"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                value={authForm.password}
                onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                required
              />
            </div>
            <button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg transition-colors">
              {authView === 'login' ? 'Login' : 'Sign Up'}
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <button 
              onClick={() => setAuthView(authView === 'login' ? 'signup' : 'login')}
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
            >
              {authView === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Login"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-indigo-600 p-2 rounded-lg text-white">
            <Briefcase size={20} />
          </div>
          <span className="font-bold text-lg text-white">JobTrack</span>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          <button 
            onClick={() => setView('jobs')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'jobs' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Briefcase size={18} /> Jobs
          </button>
          <button 
            onClick={() => setView('stats')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'stats' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <BarChart2 size={18} /> Analytics
          </button>
          <button 
            onClick={() => setView('settings')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${view === 'settings' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Settings size={18} /> Preferences
          </button>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logged in as</p>
            <p className="text-sm font-medium text-indigo-400 truncate">{user?.username || 'User'}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-900/20 text-red-400 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        <header className="h-20 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-8">
            <h2 className="text-xl font-bold text-white capitalize">{view}</h2>
            {view === 'jobs' && (
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input 
                    type="text"
                    placeholder="Search jobs..."
                    className="bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none w-64"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setPage(1);
                    }}
                  />
                  <Briefcase className="absolute left-3 top-2.5 text-slate-500" size={16} />
                </div>
                <select
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Status</option>
                  <option value="favorites">Favorites</option>
                  <option value="unprocessed">Unprocessed</option>
                  <option value="applied">Applied</option>
                  <option value="skipped">Skipped</option>
                </select>
                <select
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">All Types</option>
                  <option value="full-time">Full-time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                  <option value="unknown">Unknown</option>
                </select>
                <select
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={timeFilter}
                  onChange={(e) => {
                    setTimeFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Any time</option>
                  <option value="1d">Past 24 hours</option>
                  <option value="3d">Past 3 days</option>
                  <option value="7d">Past week</option>
                  <option value="14d">Past 2 weeks</option>
                  <option value="30d">Past month</option>
                </select>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={handleScrape}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Update Listings
            </button>
          </div>
        </header>

        <main className="p-8">
          {view === 'jobs' && (
            <div className="grid gap-4 max-w-5xl mx-auto">
              {jobs.map(job => (
                <div key={job.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all flex items-center gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-bold text-white">{job.company}</h3>
                      <span className="text-xs bg-slate-800 text-slate-400 px-2 py-0.5 rounded uppercase font-bold tracking-wider">{job.status}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold tracking-wide ${typeStyle(job.employment_type).chip}`}>
                        {typeStyle(job.employment_type).label}
                      </span>
                    </div>
                    <p className="text-indigo-400 font-medium mb-2">{job.role}</p>
                    <div className="flex gap-4 text-sm text-slate-500">
                      <span>{job.location}</span>
                      <span>•</span>
                      <span>{job.terms}</span>
                      <span>•</span>
                      <span>{job.age_text}</span>
                    </div>
                  </div>
                  
                   <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleFavoriteToggle(job.id, !job.is_favorite)}
                      className={`p-2 rounded-lg transition-colors ${job.is_favorite ? 'bg-yellow-600 text-white' : 'bg-slate-800 hover:bg-yellow-900/30 text-yellow-500'}`}
                      title={job.is_favorite ? "Unfavorite" : "Favorite"}
                    >
                      <Star size={20} fill={job.is_favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(job.id, 'applied')}
                      className={`p-2 rounded-lg transition-colors ${job.status === 'applied' ? 'bg-green-600 text-white' : 'bg-slate-800 hover:bg-green-900/30 text-green-500'}`}
                      title="Applied"
                    >
                      <CheckCircle size={20} />
                    </button>
                    <button 
                      onClick={() => handleStatusUpdate(job.id, 'skipped')}
                      className={`p-2 rounded-lg transition-colors ${job.status === 'skipped' ? 'bg-red-600 text-white' : 'bg-slate-800 hover:bg-red-900/30 text-red-500'}`}
                      title="Skip"
                    >
                      <XCircle size={20} />
                    </button>
                    <a 
                      href={job.application_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      title="Open Link"
                    >
                      <ExternalLink size={20} />
                    </a>
                  </div>
                </div>
              ))}
              {jobs.length === 0 && <div className="text-center py-20 text-slate-500">No jobs found. Try updating listings or adjusting filters.</div>}
              
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-8 pb-8">
                  <p className="text-sm text-slate-500">
                    Showing <span className="text-slate-300 font-medium">{jobs.length}</span> of <span className="text-slate-300 font-medium">{totalJobs}</span> jobs
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                    >
                      Previous
                    </button>
                    <div className="flex items-center px-4 text-sm text-slate-400 font-medium">
                      Page {page} of {totalPages}
                    </div>
                    <button 
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:hover:bg-slate-800 text-slate-300 rounded-lg transition-colors text-sm font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'stats' && stats && (
            <div className="max-w-5xl mx-auto space-y-8">
              {/* KPI row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-linear-to-br from-indigo-600/20 to-slate-900 border border-indigo-500/20 p-6 rounded-2xl">
                  <p className="text-indigo-300/70 text-xs font-bold uppercase tracking-widest mb-2">Total Listings</p>
                  <p className="text-4xl font-bold text-white tabular-nums">{stats.totalJobs ?? 0}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">You've Processed</p>
                  <p className="text-4xl font-bold text-white tabular-nums">{stats.totalProcessed}</p>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Disciplines Tracked</p>
                  <p className="text-4xl font-bold text-white tabular-nums">{stats.byDiscipline?.length ?? 0}</p>
                </div>
              </div>

              {/* Employment type distribution — the headline split */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-1">Employment Type</h3>
                <p className="text-slate-500 text-sm mb-6">Contract vs. full-time vs. internship across the current feed</p>

                <div className="flex h-4 w-full overflow-hidden rounded-full bg-slate-950 mb-6">
                  {stats.byEmploymentType?.map((t: any) => {
                    const width = stats.totalJobs > 0 ? (t.count / stats.totalJobs) * 100 : 0;
                    return (
                      <div
                        key={t.type}
                        className={`${typeStyle(t.type).bar} h-full transition-all`}
                        style={{ width: `${width}%` }}
                        title={`${t.label}: ${t.count}`}
                      />
                    );
                  })}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {stats.byEmploymentType?.map((t: any) => {
                    const share = stats.totalJobs > 0 ? Math.round((t.count / stats.totalJobs) * 100) : 0;
                    return (
                      <div key={t.type} className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full ${typeStyle(t.type).bar}`} />
                          <span className="text-sm text-slate-400">{t.label}</span>
                        </div>
                        <p className="text-2xl font-bold text-white tabular-nums">{t.count}</p>
                        <p className={`text-xs font-semibold ${typeStyle(t.type).text}`}>{share}% of feed</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Discipline × employment type cross-tab */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-1">By Discipline</h3>
                <p className="text-slate-500 text-sm mb-6">How each role area breaks down by employment type</p>
                <div className="space-y-5">
                  {stats.disciplineBreakdown?.map((d: any) => (
                    <div key={d.discipline} className="group">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-slate-200">{d.label}</span>
                        <span className="text-sm font-bold text-slate-400 tabular-nums">{d.total}</span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-950">
                        {d.types?.map((seg: any) => (
                          <div
                            key={seg.type}
                            className={`${typeStyle(seg.type).bar} h-full opacity-80 group-hover:opacity-100 transition-opacity`}
                            style={{ width: `${d.total > 0 ? (seg.count / d.total) * 100 : 0}%` }}
                            title={`${d.label} · ${seg.label}: ${seg.count}`}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                  {(!stats.disciplineBreakdown || stats.disciplineBreakdown.length === 0) && (
                    <p className="text-slate-500 text-sm">No listings yet — hit “Update Listings” to populate analytics.</p>
                  )}
                </div>
              </div>

              {/* Top companies */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Top Companies</h3>
                <div className="space-y-3">
                  {stats.topCompanies?.map((c: any) => (
                    <div key={c.company} className="flex items-center justify-between p-4 bg-slate-950/50 rounded-xl border border-slate-800/50 hover:border-slate-700 transition-colors">
                      <span className="font-medium text-slate-200">{c.company}</span>
                      <span className="bg-indigo-600/20 text-indigo-400 px-3 py-1 rounded-full text-sm font-bold tabular-nums">{c.count} Listings</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {view === 'settings' && (
            <div className="max-w-2xl mx-auto space-y-8">
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Accepted Titles</h3>
                <p className="text-slate-500 text-sm mb-6">Only roles containing these keywords will be shown (OR logic)</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prefs.accepted_titles?.map(t => (
                    <span key={t} className="bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-indigo-500/30">
                      {t}
                      <Trash2 
                        size={14} 
                        className="cursor-pointer hover:text-red-400" 
                        onClick={() => updatePrefs({ ...prefs, accepted_titles: (prefs.accepted_titles || []).filter(x => x !== t) })}
                      />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    id="add-accepted"
                    type="text" 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                    placeholder="e.g. Software, Internship"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          updatePrefs({ ...prefs, accepted_titles: [...prefs.accepted_titles, val] });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Common Roles</h3>
                <p className="text-slate-500 text-sm mb-6">Click to add to your accepted list</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedKeywords.map(({ keyword, count }) => {
                    const isSelected = prefs.accepted_titles?.some(t => t.toLowerCase() === keyword.toLowerCase());
                    if (isSelected) return null;
                    
                    return (
                      <button
                        key={keyword}
                        onClick={() => updatePrefs({ ...prefs, accepted_titles: [...(prefs.accepted_titles || []), keyword] })}
                        className="bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 hover:border-indigo-500/30 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2"
                      >
                        {keyword}
                        <span className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-slate-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Rejected Titles</h3>
                <p className="text-slate-500 text-sm mb-6">Roles containing these keywords will be filtered out</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prefs.rejected_titles?.map(t => (
                    <span key={t} className="bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-red-500/30">
                      {t}
                      <Trash2 
                        size={14} 
                        className="cursor-pointer hover:text-red-300" 
                        onClick={() => updatePrefs({ ...prefs, rejected_titles: (prefs.rejected_titles || []).filter(x => x !== t) })}
                      />
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500"
                  placeholder="e.g. Senior, Manager"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) {
                        updatePrefs({ ...prefs, rejected_titles: [...prefs.rejected_titles, val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Employment Types</h3>
                <p className="text-slate-500 text-sm mb-6">Only these employment types are shown (none selected = all)</p>
                <div className="flex flex-wrap gap-2">
                  {['full-time', 'contract', 'internship', 'unknown'].map((value) => {
                    const selected = prefs.employment_types?.includes(value);
                    const meta = typeStyle(value);
                    return (
                      <button
                        key={value}
                        onClick={() => {
                          const next = selected
                            ? prefs.employment_types.filter((t) => t !== value)
                            : [...(prefs.employment_types || []), value];
                          updatePrefs({ ...prefs, employment_types: next });
                        }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                          selected ? meta.chip : 'bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.bar}`} />
                        {meta.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Disciplines</h3>
                <p className="text-slate-500 text-sm mb-6">Only these role areas are shown (none selected = all)</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prefs.disciplines?.map((d) => {
                    const label = suggestedDisciplines.find((x) => x.discipline === d)?.label || d;
                    return (
                      <span key={d} className="bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-indigo-500/30">
                        {label}
                        <Trash2
                          size={14}
                          className="cursor-pointer hover:text-red-400"
                          onClick={() => updatePrefs({ ...prefs, disciplines: (prefs.disciplines || []).filter((x) => x !== d) })}
                        />
                      </span>
                    );
                  })}
                  {(!prefs.disciplines || prefs.disciplines.length === 0) && (
                    <span className="text-slate-600 text-sm">None selected — showing all disciplines.</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedDisciplines.map(({ discipline, label, count }) => {
                    if (prefs.disciplines?.includes(discipline)) return null;
                    return (
                      <button
                        key={discipline}
                        onClick={() => updatePrefs({ ...prefs, disciplines: [...(prefs.disciplines || []), discipline] })}
                        className="bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 hover:border-indigo-500/30 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2"
                      >
                        {label}
                        <span className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-slate-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Accepted Locations</h3>
                <p className="text-slate-500 text-sm mb-6">Only jobs in these locations will be shown (OR logic)</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prefs.accepted_locations?.map(l => (
                    <span key={l} className="bg-indigo-600/20 text-indigo-400 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-indigo-500/30">
                      {l}
                      <Trash2 
                        size={14} 
                        className="cursor-pointer hover:text-red-400" 
                        onClick={() => updatePrefs({ ...prefs, accepted_locations: (prefs.accepted_locations || []).filter(x => x !== l) })}
                      />
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-indigo-500"
                    placeholder="e.g. New York, Remote"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = (e.target as HTMLInputElement).value;
                        if (val) {
                          updatePrefs({ ...prefs, accepted_locations: [...(prefs.accepted_locations || []), val] });
                          (e.target as HTMLInputElement).value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Common Locations</h3>
                <p className="text-slate-500 text-sm mb-6">Click to add to your accepted list</p>
                <div className="flex flex-wrap gap-2">
                  {suggestedLocations.map(({ location, count }) => {
                    const isSelected = prefs.accepted_locations?.some(l => l.toLowerCase() === location.toLowerCase());
                    if (isSelected) return null;
                    
                    return (
                      <button
                        key={location}
                        onClick={() => updatePrefs({ ...prefs, accepted_locations: [...(prefs.accepted_locations || []), location] })}
                        className="bg-slate-800 hover:bg-indigo-600/20 hover:text-indigo-400 hover:border-indigo-500/30 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-sm transition-all flex items-center gap-2"
                      >
                        {location}
                        <span className="text-xs bg-slate-950 px-1.5 py-0.5 rounded text-slate-500">{count}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl">
                <h3 className="text-xl font-bold text-white mb-2">Rejected Locations</h3>
                <p className="text-slate-500 text-sm mb-6">Jobs in these locations will be filtered out</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {prefs.rejected_locations?.map(l => (
                    <span key={l} className="bg-red-600/20 text-red-400 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-red-500/30">
                      {l}
                      <Trash2 
                        size={14} 
                        className="cursor-pointer hover:text-red-300" 
                        onClick={() => updatePrefs({ ...prefs, rejected_locations: (prefs.rejected_locations || []).filter(x => x !== l) })}
                      />
                    </span>
                  ))}
                </div>
                <input 
                  type="text" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500"
                  placeholder="e.g. San Francisco"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value;
                      if (val) {
                        updatePrefs({ ...prefs, rejected_locations: [...(prefs.rejected_locations || []), val] });
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
