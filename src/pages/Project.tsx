import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  ChevronLeft, 
  ChevronRight,
  Zap, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  MessageSquare,
  DollarSign,
  List,
  Info,
  ArrowRight,
  Loader2,
  Send,
  User,
  ChevronDown
} from 'lucide-react';

interface Project {
  projectId: string;
  projectType: string;
  status: string;
  updatedOn: string;
  firstName?: string;
  chargerType?: string;
  quote_total?: string;
  currentStatus?: {
    log: Array<{ status: string; updatedOn: string }>;
  };
}

type ViewState = 'dashboard' | 'quote' | 'details' | 'messages' | 'faq';

const STATUS_MAP: Record<string, string> = {
  'PENDING APPLICATION': 'Pending Application',
  'CREATED': 'Project Created',
  'IN PROGRESS': 'In Progress',
  'COMPLETED': 'Completed',
  'WON': 'Won',
  'LOST': 'Lost'
};

export default function Project() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [language, setLanguage] = useState<'English' | 'Spanish'>('English');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);

  const parseDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const normalized = (dateStr.includes('Z') || dateStr.includes('+') || dateStr.includes('-')) 
      ? dateStr 
      : dateStr.replace(' ', 'T') + 'Z';
    return new Date(normalized);
  };
  const [socket, setSocket] = useState<Socket | null>(null);
  const [threadId, setThreadId] = useState<number | null>(null);
  const [threadStatus, setThreadStatus] = useState<'open' | 'closed'>('open');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    const cached = localStorage.getItem('jt_projects');
    if (cached) {
      const projects = JSON.parse(cached);
      const found = projects.find((p: Project) => p.projectId === projectId);
      if (found) {
        setProject(found);
        localStorage.setItem('jt_selectedProjectId', projectId!);
        setLoading(false); // Show cached data immediately
        loadProjectData(projectId!);
      } else {
        loadProjectData(projectId!);
      }
    } else {
      loadProjectData(projectId!);
    }
  }, [projectId]);

  async function loadProjectData(id: string) {
    try {
      // Fetch Comms/Messaging Data
      const response = await fetch(`/api/comms/page/${id}`);
      if (response.ok) {
        const data = await response.json();
        setThreadId(data.threadId);
        setMessages(data.messages || []);
        setThreadStatus(data.threadStatus || 'open');

        if (data.project) {
          setProject(prev => ({
            ...prev,
            ...data.project,
            projectId: data.project.id || prev?.projectId || id
          } as Project));
        }
      }
    } catch (err) {
      console.error('Error loading project data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!socket || !threadId) return;
    
    socket.emit('join-thread', threadId);
    socket.on('new-message', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socket.off('new-message');
    };
  }, [socket, threadId]);

  useEffect(() => {
    if (currentView === 'messages' && messages.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentView]);

  async function handleSendMessage() {
    if (!newMessage.trim() || !projectId || sending) return;
    if (threadStatus === 'closed') {
      alert('This conversation is closed.');
      return;
    }

    const body = newMessage.trim();
    setNewMessage('');
    setSending(true);

    // Optimistic update
    const tempMsg = {
      body,
      senderType: 'customer',
      createdAt: new Date().toISOString(),
      id: Date.now()
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const response = await fetch(`/api/comms/message/${projectId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body })
      });

      if (!response.ok) {
        // Rollback optimistic update if failed
        setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
        setNewMessage(body); // put text back
        const errData = await response.json();
        console.error('Failed to send message:', errData);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
      setNewMessage(body);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Mascot size="lg" animate />
        <Loader2 className="text-teal-600 animate-spin mt-8 mb-4" size={48} />
        <p className="text-slate-600 font-medium">Loading project details...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
          <AlertCircle size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">Project Not Found</h1>
          <p className="text-slate-600">We couldn't find the project you're looking for.</p>
        </div>
        <button 
          onClick={() => navigate('/projects')}
          className="px-8 py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20 active:scale-95 transition-transform"
        >
          Back to Projects
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-teal-50 sticky top-0 z-10 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => currentView === 'dashboard' ? navigate('/projects') : setCurrentView('dashboard')}
              className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors active:scale-90"
            >
              <ChevronLeft size={20} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {currentView === 'dashboard' ? project.projectType : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h1>
              <p className="text-xs text-slate-500 font-medium">ID: {project.projectId.substring(0, 8)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex bg-slate-50 p-1 rounded-full border border-slate-100">
              <button
                onClick={() => setLanguage('English')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  language === 'English' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('Spanish')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  language === 'Spanish' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400'
                }`}
              >
                ES
              </button>
            </div>
            <button 
              onClick={() => navigate('/projects')}
              className="text-xs font-bold text-teal-600 bg-teal-50 px-3 py-2 rounded-full hover:bg-teal-100 transition-colors"
            >
              Switch
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-6 space-y-6">
        <AnimatePresence mode="wait">
          {currentView === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Mascot & Welcome Message */}
              <div className="flex flex-col items-center text-center py-4">
                <Mascot size="lg" />
                <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-teal-50 relative w-full">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-t border-l border-teal-50 rotate-45" />
                  <p className="text-lg font-medium text-slate-800 leading-relaxed">
                    {language === 'English' 
                      ? `Hi ${project.firstName || 'there'}! Your ${project.projectType || 'installation'} is moving along nicely. Here's your latest project overview.`
                      : `¡Hola ${project.firstName || 'amigo'}! Tu ${project.projectType || 'instalación'} está avanzando bien. Aquí tienes el resumen más reciente de tu proyecto.`
                    }
                  </p>
                </div>
              </div>

              {/* Status Card */}
              <motion.div 
                className="bg-white p-8 rounded-[32px] shadow-sm border border-teal-50 space-y-8"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-teal-50 rounded-full flex items-center justify-center text-teal-600">
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Current Status</p>
                      <h2 className="text-2xl font-bold text-slate-800">{STATUS_MAP[project.status] || project.status}</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Updated</p>
                    <p className="text-sm font-bold text-slate-700">
                      {project.updatedOn && !isNaN(new Date(project.updatedOn).getTime()) 
                        ? new Date(project.updatedOn).toLocaleDateString() 
                        : 'Recently'}
                    </p>
                  </div>
                </div>

                <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    className="h-full bg-teal-500 rounded-full"
                  />
                </div>
              </motion.div>

              {/* Quick Actions */}
              <div className="grid gap-3">
                <NavButton 
                  icon={<DollarSign className="text-teal-600" size={20} />} 
                  label="Quote" 
                  description="View your installation quote"
                  onClick={() => setCurrentView('quote')} 
                />
                <NavButton 
                  icon={<List className="text-teal-600" size={20} />} 
                  label="Details" 
                  description="Project specifications"
                  onClick={() => setCurrentView('details')} 
                />
                <NavButton 
                  icon={<MessageSquare className="text-teal-600" size={20} />} 
                  label="Messages" 
                  description="Chat with your installer"
                  onClick={() => setCurrentView('messages')} 
                  badge={messages.some(m => m.senderType === 'installer')}
                />
                <NavButton 
                  icon={<Info className="text-teal-600" size={20} />} 
                  label="FAQ" 
                  description="Commonly asked questions"
                  onClick={() => setCurrentView('faq')} 
                />
              </div>

              {/* Status Log */}
              {project.currentStatus?.log && (
                <div className="space-y-4">
                  <h3 className="font-bold text-slate-800 px-2">Recent Updates</h3>
                  <div className="bg-white rounded-3xl shadow-sm border border-teal-50 overflow-hidden">
                    {project.currentStatus.log.map((log, idx) => (
                      <div key={idx} className={`p-4 flex items-start gap-4 ${idx !== project.currentStatus!.log.length - 1 ? 'border-b border-slate-50' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-teal-50 text-teal-600' : 'bg-slate-50 text-slate-400'}`}>
                          {idx === 0 ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${idx === 0 ? 'text-slate-800' : 'text-slate-500'}`}>{STATUS_MAP[log.status] || log.status}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{new Date(log.updatedOn).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {currentView === 'quote' && (
            <DetailView title="Quote" onBack={() => setCurrentView('dashboard')}>
              <div className="bg-white rounded-3xl p-8 border border-teal-50 shadow-sm">
                <div className="mb-8 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total</span>
                  <span className="text-4xl font-bold text-teal-600">{project.quote_total || '£0.00'}</span>
                </div>
                <div className="space-y-3 border-t border-slate-50 pt-6">
                  <div className="flex gap-3 items-start">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-200 shrink-0" />
                    <span className="text-sm text-slate-600 leading-tight">
                      {project.chargerType || 'EV Charger'} Installation
                    </span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-200 shrink-0" />
                    <span className="text-sm text-slate-600 leading-tight">Standard Installation Package</span>
                  </div>
                </div>
              </div>
            </DetailView>
          )}

          {currentView === 'details' && (
            <DetailView title="Details" onBack={() => setCurrentView('dashboard')}>
              <div className="bg-white rounded-3xl p-8 border border-teal-50 shadow-sm grid gap-6">
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project ID</span>
                  <span className="text-sm text-slate-700 font-medium">{project.projectId}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Project Type</span>
                  <span className="text-sm text-slate-700 font-medium">{project.projectType}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Charger Type</span>
                  <span className="text-sm text-slate-700 font-medium">{project.chargerType || 'Not specified'}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</span>
                  <span className="text-sm text-slate-700 font-medium">{STATUS_MAP[project.status] || project.status}</span>
                </div>
              </div>
            </DetailView>
          )}

          {currentView === 'faq' && (
            <DetailView title="FAQ" onBack={() => setCurrentView('dashboard')}>
              <FAQAccordion language={language} />
            </DetailView>
          )}

          {currentView === 'messages' && (
            <DetailView title="Messages" onBack={() => setCurrentView('dashboard')}>
              <div className="flex flex-col h-[60vh] bg-white rounded-3xl border border-teal-50 shadow-sm overflow-hidden">
                <div className="flex-1 relative overflow-hidden bg-slate-50/30">
                  <div 
                    ref={chatContainerRef}
                    className="absolute inset-0 overflow-y-auto p-6 space-y-4"
                  >
                    {messages.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Send className="text-teal-400" size={24} />
                        </div>
                        <p className="text-slate-400 text-sm">No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, i) => (
                          <div 
                            key={i} 
                            className={`flex ${msg.senderType === 'customer' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[85%] flex gap-2 ${msg.senderType === 'customer' ? 'flex-row-reverse' : 'flex-row'}`}>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                                msg.senderType === 'customer' ? 'bg-teal-600 text-white' : 'bg-white border border-slate-100 text-slate-400'
                              }`}>
                                {msg.senderType === 'customer' ? <User size={14} /> : <Zap size={14} />}
                              </div>
                              <div className="flex flex-col">
                                <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                                  msg.senderType === 'customer' 
                                    ? 'bg-teal-600 text-white rounded-tr-none' 
                                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                                }`}>
                                  {msg.body}
                                  <div className={`text-[10px] mt-1 opacity-60 ${msg.senderType === 'customer' ? 'text-right' : 'text-left'}`}>
                                    {parseDate(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>
                </div>

                <div className="p-4 bg-white border-t border-slate-100">
                  <div className="flex gap-2">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 resize-none h-[44px]"
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || sending}
                      className="w-11 h-11 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 disabled:opacity-50 transition-all"
                    >
                      <Send size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </DetailView>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function NavButton({ icon, label, description, onClick, badge }: { icon: React.ReactNode, label: string, description: string, onClick: () => void, badge?: boolean }) {
  return (
    <button 
      onClick={onClick}
      className="w-full bg-white p-5 rounded-2xl shadow-sm border border-teal-50 flex items-center justify-between group hover:border-teal-200 transition-all active:scale-[0.98] relative"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-teal-50 transition-colors">
          {icon}
        </div>
        <div className="text-left">
          <div className="font-bold text-slate-700">{label}</div>
          <div className="text-[10px] text-slate-400 font-medium">{description}</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {badge && (
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm border-2 border-white" />
        )}
        <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors" size={20} />
      </div>
    </button>
  );
}

function DetailView({ title, children, onBack }: { title: string, children: React.ReactNode, onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <button 
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-white shadow-sm border border-slate-100 flex items-center justify-center text-slate-600 active:scale-90 transition-transform"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

function FAQAccordion({ language }: { language: 'English' | 'Spanish' }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: { en: "What happens during an installation?", es: "¿Qué sucede durante una instalación?" },
      a: { en: "The electrician will review the plan, run wiring from your panel, mount the charger, and test everything to ensure it's working perfectly.", es: "El electricista revisará el plan, instalará el cableado desde su panel, montará el cargador y probará todo para asegurarse de que funcione perfectamente." }
    },
    {
      q: { en: "How long does the installation take?", es: "¿Cuánto tiempo toma la instalación?" },
      a: { en: "Most standard home installations take between 2 to 4 hours, depending on the distance from your electrical panel to the charger.", es: "La mayoría de las instalaciones domésticas estándar toman entre 2 y 4 horas, dependiendo de la distancia desde su panel eléctrico hasta el cargador." }
    },
    {
      q: { en: "Do I need to be home for the installation?", es: "¿Debo estar en casa para la instalación?" },
      a: { en: "Yes, someone over 18 needs to be present to provide access to the electrical panel and confirm the final placement of the charger.", es: "Sí, alguien mayor de 18 años debe estar presente para facilitar el acceso al panel eléctrico y confirmar la ubicación final del cargador." }
    },
    {
      q: { en: "Can I use my charger in the rain?", es: "¿Puedo usar mi cargador bajo la lluvia?" },
      a: { en: "Absolutely. Home chargers are designed to be weather-resistant and safe for outdoor use in all conditions, including rain and snow.", es: "Absolutamente. Los cargadores domésticos están diseñados para ser resistentes a la intemperie y seguros para su uso en exteriores en todas las condiciones, incluyendo lluvia y nieve." }
    }
  ];

  return (
    <div className="space-y-3">
      {faqs.map((faq, index) => (
        <div key={index} className="bg-white rounded-2xl border border-teal-50 shadow-sm overflow-hidden">
          <button
            onClick={() => setOpenIndex(openIndex === index ? null : index)}
            className="w-full px-5 py-4 text-left flex justify-between items-center hover:bg-slate-50 transition-colors"
          >
            <span className="font-bold text-slate-700 pr-4">{language === 'English' ? faq.q.en : faq.q.es}</span>
            <motion.div
              animate={{ rotate: openIndex === index ? 180 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <ChevronRight className="text-teal-500" size={20} />
            </motion.div>
          </button>
          <AnimatePresence>
            {openIndex === index && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="px-5 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3">
                  {language === 'English' ? faq.a.en : faq.a.es}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

function Mascot({ size = 'md', animate = false }: { size?: 'sm' | 'md' | 'lg', animate?: boolean }) {
  const dimensions = { sm: 'w-12 h-12', md: 'w-24 h-24', lg: 'w-32 h-32' };
  return (
    <motion.div 
      className={`${dimensions[size]} relative`}
      animate={animate ? { y: [0, -10, 0] } : {}}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
        <rect x="20" y="30" width="60" height="60" rx="12" fill="#0D9488" />
        <rect x="25" y="35" width="50" height="50" rx="8" fill="#14B8A6" />
        <rect x="32" y="42" width="36" height="24" rx="4" fill="#F0FDFA" />
        <motion.circle cx="42" cy="52" r="3" fill="#0F172A" animate={{ scaleY: [1, 0.1, 1] }} transition={{ repeat: Infinity, duration: 3, times: [0, 0.95, 1] }} />
        <motion.circle cx="58" cy="52" r="3" fill="#0F172A" animate={{ scaleY: [1, 0.1, 1] }} transition={{ repeat: Infinity, duration: 3, times: [0, 0.95, 1] }} />
        <path d="M44 60C44 60 47 62 50 62C53 62 56 60 56 60" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
        <path d="M80 75C85 75 90 70 90 65V55" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
        <rect x="85" y="45" width="10" height="10" rx="2" fill="#0D9488" />
        <rect x="88" y="40" width="1" height="5" fill="#94A3B8" />
        <rect x="91" y="40" width="1" height="5" fill="#94A3B8" />
        <path d="M50 72L47 80H53L50 88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}
