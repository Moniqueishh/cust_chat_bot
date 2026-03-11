import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchProjectsFromN8N } from '../utils/auth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Loader2, 
  LogOut, 
  ChevronRight, 
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';

interface Project {
  projectId: string;
  projectType: string;
  status: string;
  installer?: string;
  jobType?: string;
  customerName?: string;
  email?: string;
  updatedOn?: string;
}

const STATUS_MAP: Record<string, string> = {
  'PENDING APPLICATION': 'Pending Application',
  'CREATED': 'Project Created',
  'IN PROGRESS': 'In Progress',
  'COMPLETED': 'Completed',
  'WON': 'Won',
  'LOST': 'Lost',
  'QUOTE APPROVED': 'Quote Approved'
};

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customerName, setCustomerName] = useState<string | null>(localStorage.getItem('jt_customerName'));

  const email = localStorage.getItem('jt_email');

  useEffect(() => {
    if (!email) {
      navigate('/');
      return;
    }

    const loadProjects = async () => {
      try {
        setLoading(true);
        const res = await fetch(import.meta.env.VITE_N8N_PROJECT_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });

        const data = await res.json();
        const normalized = Array.isArray(data) ? data[0] : data;
        const projectsData = Array.isArray(normalized?.projects) ? normalized.projects : [];

        console.log("Raw n8n response:", data);
        console.log("Normalized response:", normalized);
        console.log("Projects parsed:", projectsData);

        if (normalized?.customerName) {
          setCustomerName(normalized.customerName);
          localStorage.setItem('jt_customerName', normalized.customerName);
        }

        setProjects(projectsData);
        localStorage.setItem("jt_projects", JSON.stringify(projectsData));
      } catch (err) {
        console.error('Failed to load projects:', err);
        setError('Failed to load your projects. Please try again.');
        
        // Try to load from cache if fetch fails
        const cached = localStorage.getItem('jt_projects');
        if (cached) {
          setProjects(JSON.parse(cached));
        }
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, [email, navigate]);

  const handleLogout = () => {
    localStorage.removeItem('jt_email');
    localStorage.removeItem('jt_customerName');
    localStorage.removeItem('jt_tokenPayload');
    localStorage.removeItem('jt_projects');
    localStorage.removeItem('jt_selectedProjectId');
    navigate('/');
  };

  const filteredProjects = searchQuery.trim() === '' 
    ? projects 
    : projects.filter(p => 
        p.projectType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.status?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.installer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.jobType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.projectId?.toLowerCase().includes(searchQuery.toLowerCase())
      );

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="text-teal-600 animate-spin mb-4" size={48} />
        <p className="text-slate-600 font-medium">Loading your projects...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-teal-50 sticky top-0 z-10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center shadow-lg shadow-teal-600/20">
              <Zap className="text-white" size={20} fill="currentColor" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">{customerName || 'My Projects'}</h1>
              <p className="text-xs text-slate-500 font-medium">{email}</p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors active:scale-90"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Search & Filter */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-teal-50 rounded-2xl py-4 pl-12 pr-4 shadow-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all text-slate-700 font-medium"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 text-red-600">
            <AlertCircle size={20} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Projects List */}
        <div className="space-y-4">
          {!loading && projects.length === 0 ? (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800">No projects found</h3>
                <p className="text-slate-500 text-sm">We couldn't find any projects for your account.</p>
              </div>
            </div>
          ) : filteredProjects.length > 0 ? (
            filteredProjects.map((project, idx) => (
              <motion.button
                key={project.projectId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                onClick={() => navigate(`/project/${project.projectId}`)}
                className="w-full bg-white p-6 rounded-3xl shadow-sm border border-teal-50 flex items-center justify-between group hover:border-teal-200 transition-all active:scale-[0.98] text-left"
              >
                <div>
                  <h3 className="font-bold text-slate-800 text-lg mb-1">{project.projectType}</h3>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      project.status === 'COMPLETED' || project.status === 'WON' 
                        ? 'bg-emerald-500' 
                        : 'bg-amber-500'
                    }`} />
                    <span className="text-sm text-slate-500 font-medium">
                      {STATUS_MAP[project.status] || project.status}
                    </span>
                    <span className="text-[10px] text-slate-300 font-medium ml-2">
                      ID: {project.projectId.substring(0, 8)}
                    </span>
                  </div>
                </div>
                <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors shrink-0" size={24} />
              </motion.button>
            ))
          ) : (
            <div className="text-center py-20 space-y-4">
              <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Search size={32} />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800">No results</h3>
                <p className="text-slate-500 text-sm">No projects match your search query.</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
