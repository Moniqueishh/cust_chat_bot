import React, { useEffect, useState, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { io, Socket } from 'socket.io-client';
import { 
  CheckCircle2, 
  ArrowRight, 
  Info, 
  Zap,
  DollarSign,
  List,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Clock,
  Send,
  User,
  Activity,
  MessageSquare,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  Users
} from 'lucide-react';
import { generateAssistantResponse, AssistantResponse } from './services/geminiService';

type ViewState = 'overview' | 'history' | 'next' | 'costs' | 'details' | 'faq' | 'messaging' | 'admin';

interface Message {
  senderType: 'customer' | 'internal' | 'installer' | 'system';
  body: string;
  createdAt: string;
}

const UI_TRANSLATIONS = {
  English: {
    next: "What happens next",
    costs: "Quote",
    details: "Project details",
    waiting: "Still waiting on",
    home: "Home",
    checking: "Checking your project...",
    gathering: "Gathering your details.",
    faq: "Common Questions",
    messaging: "Messages",
    messageInstaller: "Message Your Installer",
    send: "Send",
    placeholder: "Type your message here...",
    closed: "This thread is closed. You can view previous messages but cannot send new ones.",
    expired: "This link has expired. Please contact support for a new one.",
    invalid: "Invalid or expired link.",
    contact: "Contact Installer"
  },
  Spanish: {
    next: "Qué sigue",
    costs: "Cotización",
    details: "Detalles del proyecto",
    waiting: "Aún esperando",
    home: "Inicio",
    checking: "Revisando tu proyecto...",
    gathering: "Reuniendo tus detalles.",
    faq: "Preguntas Comunes",
    messaging: "Mensajes",
    messageInstaller: "Mensaje a tu instalador",
    send: "Enviar",
    placeholder: "Escribe tu mensaje aquí...",
    closed: "Este hilo está cerrado. Puedes ver los mensajes anteriores pero no puedes enviar nuevos.",
    expired: "Este enlace ha expirado. Por favor, contacta con soporte para uno nuevo.",
    invalid: "Enlace inválido o expirado.",
    contact: "Contactar Instalador"
  }
};

const STATUS_MAP: Record<string, string> = {
  'in_progress': 'In Progress',
  'ready_for_survey': 'Ready for Site Survey',
  'survey_submitted': 'Site Survey Submitted',
  'awaiting_payment': 'Awaiting Payment',
  'payment_received': 'Payment Received',
  'installation_scheduled': 'Installation Scheduled',
  'completed': 'Installation Completed',
  'cancelled': 'Project Cancelled'
};

export default function App() {
  const [token, setToken] = useState<string | null>(null);
  const [assistantData, setAssistantData] = useState<AssistantResponse | null>(null);
  const [threadData, setThreadData] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [threadStatus, setThreadStatus] = useState<'open' | 'closed'>('open');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>('overview');
  const [language, setLanguage] = useState<'English' | 'Spanish'>('English');
  const [newMessage, setNewMessage] = useState('');
  const [adminReply, setAdminReply] = useState('');
  const [sending, setSending] = useState(false);
  const [adminSending, setAdminSending] = useState(false);
  const adminChatEndRef = useRef<HTMLDivElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const [adminShowScrollDown, setAdminShowScrollDown] = useState(false);
  const [adminProjectId, setAdminProjectId] = useState('');
  const [adminGeneratedLink, setAdminGeneratedLink] = useState('');
  const [copying, setCopying] = useState(false);
  const [adminThreads, setAdminThreads] = useState<any[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminSelectedThread, setAdminSelectedThread] = useState<any>(null);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [statsRange, setStatsRange] = useState<'today' | '7d' | '30d' | 'year'>('7d');
  const [adminActiveTab, setAdminActiveTab] = useState<'all' | 'needsResponse'>('all');
  const [threadId, setThreadId] = useState<number | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  const t = UI_TRANSLATIONS[language];

  const fetchAdminStats = async (range: string = statsRange) => {
    try {
      let start = '';
      let end = new Date().toISOString().split('T')[0];
      
      const d = new Date();
      if (range === 'today') {
        start = end;
      } else if (range === '7d') {
        d.setDate(d.getDate() - 6);
        start = d.toISOString().split('T')[0];
      } else if (range === '30d') {
        d.setDate(d.getDate() - 29);
        start = d.toISOString().split('T')[0];
      } else if (range === 'year') {
        start = `${d.getFullYear()}-01-01`;
      }
      
      const res = await fetch(`/api/admin/stats?start=${start}&end=${end}`);
      const data = await res.json();
      setAdminStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const trackEvent = async (event: string, tileName?: string, isUnique: boolean = false) => {
    try {
      await fetch('/api/comms/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event, tileName, isUnique })
      });
    } catch (err) {
      console.error('Failed to track event:', err);
    }
  };

  const aggregateStats = (stats: any[]) => {
    const totals = {
      linksSent: 0,
      uniqueOpens: 0,
      totalOpens: 0,
      messageOpens: 0,
      customerMessages: 0,
      installerMessages: 0,
      conversationCount: 0,
      afterHoursMessages: 0,
      responseTimeSum: 0,
      responseTimeCount: 0,
      tileClicks: {} as Record<string, number>,
      categories: {} as Record<string, number>
    };

    if (!Array.isArray(stats)) return { ...totals, engagedRate: 0, conversationRate: 0, avgResponseTime: 0, topCategories: [] };

    stats.forEach(s => {
      totals.linksSent += s.linksSent || 0;
      totals.uniqueOpens += s.uniqueOpens || 0;
      totals.totalOpens += s.totalOpens || 0;
      totals.messageOpens += s.messageOpens || 0;
      totals.customerMessages += s.customerMessages || 0;
      totals.installerMessages += s.installerMessages || 0;
      totals.conversationCount += s.conversationCount || 0;
      totals.afterHoursMessages += s.afterHoursMessages || 0;
      totals.responseTimeSum += s.responseTimeSum || 0;
      totals.responseTimeCount += s.responseTimeCount || 0;
      
      const tc = JSON.parse(s.tileClicks || '{}');
      Object.entries(tc).forEach(([k, v]) => {
        totals.tileClicks[k] = (totals.tileClicks[k] || 0) + (v as number);
      });
      
      const cat = JSON.parse(s.categories || '{}');
      Object.entries(cat).forEach(([k, v]) => {
        totals.categories[k] = (totals.categories[k] || 0) + (v as number);
      });
    });

    return {
      ...totals,
      engagedRate: totals.linksSent ? (totals.uniqueOpens / totals.linksSent) : 0,
      conversationRate: totals.uniqueOpens ? (totals.conversationCount / totals.uniqueOpens) : 0,
      avgResponseTime: totals.responseTimeCount ? (totals.responseTimeSum / totals.responseTimeCount) : 0,
      topCategories: Object.entries(totals.categories)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }))
    };
  };

  useEffect(() => {
    const s = io();
    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    if (currentView === 'admin') {
      socket.emit('join-admin');
      socket.on('thread-updated', (updatedThread) => {
        setAdminThreads(prev => {
          const index = prev.findIndex(t => t.id === updatedThread.id);
          if (index === -1) return [updatedThread, ...prev];
          const newThreads = [...prev];
          newThreads[index] = updatedThread;
          return newThreads.sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
        });
        fetchAdminStats(statsRange);
      });
      fetchAdminStats(statsRange);
    }

    if (threadId) {
      socket.emit('join-thread', threadId);
      socket.on('new-message', (msg) => {
        setMessages(prev => {
          if (prev.some(m => m.createdAt === msg.createdAt && m.body === msg.body)) return prev;
          return [...prev, msg];
        });
        
        // Update unread status if it's from installer and we're not in messaging view
        if (msg.senderType === 'installer' && currentView !== 'messaging') {
          setThreadData((prev: any) => prev ? { ...prev, unreadForCustomer: 1 } : prev);
        }
      });
    }

    return () => {
      socket.off('thread-updated');
      socket.off('new-message');
    };
  }, [socket, currentView, threadId]);

  useEffect(() => {
    if (!socket || !adminSelectedThread) return;
    
    const tid = adminSelectedThread.thread.id;
    socket.emit('join-thread', tid);
    
    const handleNewAdminMsg = (msg: any) => {
      setAdminSelectedThread((prev: any) => {
        if (!prev || prev.thread.id !== tid) return prev;
        if (prev.messages.some((m: any) => m.createdAt === msg.createdAt && m.body === msg.body)) return prev;
        return {
          ...prev,
          messages: [...prev.messages, msg]
        };
      });
    };

    socket.on('new-message', handleNewAdminMsg);
    return () => {
      socket.off('new-message', handleNewAdminMsg);
    };
  }, [socket, adminSelectedThread]);

  useEffect(() => {
    if (currentView === 'admin') {
      fetch('/api/admin/threads')
        .then(res => res.json())
        .then(setAdminThreads)
        .catch(err => console.error('Failed to load admin threads:', err));
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'messaging' && token) {
      trackEvent('message_open');
      fetch(`/api/comms/read/${token}`, { method: 'POST' })
        .then(() => {
          setThreadData((prev: any) => prev ? { ...prev, unreadForCustomer: 0 } : prev);
        })
        .catch(err => console.error('Failed to mark as read:', err));
    }
  }, [currentView, token]);

  useEffect(() => {
    if (adminSelectedThread) {
      // Use instant scroll when first selecting a thread
      const timer = setTimeout(() => {
        adminChatEndRef.current?.scrollIntoView({ behavior: 'instant' });
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [adminSelectedThread?.thread?.id]);

  useEffect(() => {
    if (adminSelectedThread && adminSelectedThread.messages.length > 0) {
      // Use smooth scroll for new messages in the thread
      adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [adminSelectedThread?.messages]);

  const isInitialMessagingLoad = useRef(true);

  useEffect(() => {
    if (currentView === 'messaging') {
      isInitialMessagingLoad.current = true;
    }
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'messaging' && messages.length > 0) {
      const isInitial = isInitialMessagingLoad.current;
      
      if (isInitial) {
        const jump = () => {
          if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          }
        };
        // Multiple attempts to handle layout shifts and animations
        jump();
        const t1 = setTimeout(jump, 50);
        const t2 = setTimeout(jump, 200);
        const t3 = setTimeout(jump, 500);
        isInitialMessagingLoad.current = false;
        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
          clearTimeout(t3);
        };
      } else {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, currentView]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setShowScrollDown(!isAtBottom);
  };

  const handleAdminScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
    setAdminShowScrollDown(!isAtBottom);
  };

  // Scroll to top when view changes
  useEffect(() => {
    const timer = setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }, 0);
    return () => clearTimeout(timer);
  }, [currentView]);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');

    if (path === '/admin' || view === 'admin') {
      setCurrentView('admin');
      setLoading(false);
      return;
    }

    const tokenMatch = path.match(/^\/p\/([^\/]+)\/?$/);
    const pId = params.get('projectId');

    if (tokenMatch) {
      const tkn = tokenMatch[1];
      setToken(tkn);
      loadCommsData(tkn);
    } else if (pId) {
      setToken(pId);
      loadCommsData(pId);
    } else {
      // Default to demo project if no identifier is provided
      const demoToken = 'DEMO-PROJECT-001';
      setToken(demoToken);
      loadCommsData(demoToken);
    }
  }, []);

  async function loadCommsData(tkn: string) {
    console.log('[App] Loading data for token:', tkn);
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/comms/page/${tkn}`);
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to load project data');
      }
      const data = await response.json();
      console.log('[App] Data loaded successfully:', data);
      
      if (data.expired) {
        setError('expired');
        setLoading(false);
        return;
      }

      setThreadId(data.threadId);
      setThreadData(data);
      setThreadStatus(data.threadStatus || 'open');
      setMessages(data.messages || []);
      
      let assistantResponse: AssistantResponse;
      
      // Special handling for demo project to be instant
      const statusLabel = data.project.status ? (STATUS_MAP[data.project.status] || data.project.status.replace(/_/g, ' ')) : 'In Progress';
      
      if (tkn === 'DEMO-PROJECT-001') {
        assistantResponse = {
          en: {
            customer_message: "Hi Demo! Your Easee One charger installation is moving along nicely. We've received your details and are currently reviewing your site survey.",
            status_summary: `Current Status: ${statusLabel}`,
            what_happened: ["Project created", "Details received", "Site survey submitted"],
            what_happens_next: ["Site survey review", "Quote generation", "Installation scheduling"],
            quote_total: "£849.00",
            quote_items: ["Easee One Charger", "Standard Installation", "OZEV Grant Application"],
            key_details: ["Charger: Easee One", `Status: ${statusLabel}`],
            needs_info: []
          },
          es: {
            customer_message: "¡Hola Demo! La instalación de tu cargador Easee One avanza a buen ritmo. Hemos recibido tus datos y estamos revisando tu encuesta del sitio.",
            status_summary: `Estado actual: ${statusLabel}`,
            what_happened: ["Proyecto creado", "Detalles recibidos", "Encuesta del sitio enviada"],
            what_happens_next: ["Revisión de encuesta", "Generación de presupuesto", "Programación de instalación"],
            quote_total: "£849.00",
            quote_items: ["Cargador Easee One", "Instalación estándar", "Solicitud de subvención OZEV"],
            key_details: ["Cargador: Easee One", `Estado: ${statusLabel}`],
            needs_info: []
          }
        };
      } else {
        try {
          // Try to get AI response with a timeout to prevent hanging
          const aiPromise = generateAssistantResponse(data.project);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('AI Timeout')), 8000)
          );
          assistantResponse = await Promise.race([aiPromise, timeoutPromise]) as AssistantResponse;
          
          // Override status summary if it's too generic
          if (assistantResponse.en.status_summary.toLowerCase().includes('in progress')) {
            assistantResponse.en.status_summary = `Current Status: ${statusLabel}`;
          }
          if (assistantResponse.es.status_summary.toLowerCase().includes('en progreso')) {
            assistantResponse.es.status_summary = `Estado actual: ${statusLabel}`;
          }
        } catch (aiErr) {
          console.warn('[App] AI Generation failed or timed out, using fallback:', aiErr);
          // Basic fallback if AI fails or is too slow
          assistantResponse = {
            en: {
              customer_message: `Hi ${data.project.firstName || 'there'}! We're working on your ${data.project.chargerType || 'EV charger'} installation.`,
              status_summary: `Current Status: ${statusLabel}`,
              what_happened: ["Project created", "Details received"],
              what_happens_next: ["Site survey review", "Quote generation"],
              quote_total: data.project.quote_total || "Calculating...",
              quote_items: ["Standard Installation"],
              key_details: [`Charger: ${data.project.chargerType || 'EV Charger'}`, `Status: ${statusLabel}`],
              needs_info: []
            },
            es: {
              customer_message: `¡Hola ${data.project.firstName || 'amigo'}! Estamos trabajando en la instalación de tu ${data.project.chargerType || 'cargador EV'}.`,
              status_summary: `Estado actual: ${statusLabel}`,
               what_happened: ["Proyecto creado", "Detalles recibidos"],
              what_happens_next: ["Revisión de encuesta", "Generación de presupuesto"],
              quote_total: data.project.quote_total || "Calculando...",
              quote_items: ["Instalación estándar"],
              key_details: [`Cargador: ${data.project.chargerType || 'Cargador EV'}`, `Estado: ${statusLabel}`],
              needs_info: []
            }
          };
        }
      }

      setAssistantData(assistantResponse);
      setMessages(data.messages);
      setThreadStatus(data.threadStatus);
      
      // Track unique page open
      const hasVisited = sessionStorage.getItem(`visited-${tkn}`);
      if (!hasVisited) {
        trackEvent('page_open', undefined, true);
        sessionStorage.setItem(`visited-${tkn}`, 'true');
      }
    } catch (err: any) {
      console.error('[App] Error loading comms data:', err);
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendMessage() {
    console.log('[Messaging] Attempting to send message. Token:', token, 'Status:', threadStatus);
    if (!newMessage.trim() || !token || sending || threadStatus === 'closed') {
      console.log('[Messaging] Send blocked:', { 
        empty: !newMessage.trim(), 
        noToken: !token, 
        sending, 
        closed: threadStatus === 'closed'
      });
      return;
    }

    setSending(true);
    try {
      const response = await fetch(`/api/comms/message/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: newMessage })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to send message');
      }

      setNewMessage('');
      console.log('[Messaging] Message sent successfully');
    } catch (err: any) {
      console.error('[Messaging] Error sending message:', err);
      alert(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f9f9] flex flex-col items-center justify-center p-6 text-center">
        <Mascot size="lg" animate />
        <h2 className="text-xl font-bold text-slate-800 mt-8">
          {t.checking}
        </h2>
        <p className="text-slate-500 mt-2">
          {t.gathering}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#f0f9f9] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm border border-red-50 mb-6">
          <AlertCircle className="text-red-500" size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Error</h2>
        <p className="text-slate-500 text-sm max-w-xs mx-auto mb-8">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="bg-teal-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm active:scale-95 transition-transform"
        >
          Try Again
        </button>
      </div>
    );
  }

  const data = assistantData ? (language === 'English' ? assistantData.en : assistantData.es) : null;

  return (
    <div className="min-h-screen bg-[#f0f9f9] text-slate-800 font-sans pb-12">
      {/* Header */}
      <header className={`px-6 pt-8 pb-4 flex justify-between items-center ${currentView === 'admin' ? 'max-w-5xl' : 'max-w-lg'} mx-auto`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white">
            <Zap size={16} fill="currentColor" />
          </div>
          <span className="font-bold text-slate-900 tracking-tight">Jumptech</span>
        </div>
        
        <div className="flex items-center gap-4">
          {currentView !== 'admin' && (
            <div className="flex bg-white p-1 rounded-full shadow-sm border border-teal-50">
              <button
                onClick={() => setLanguage('English')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  language === 'English' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => setLanguage('Spanish')}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  language === 'Spanish' 
                    ? 'bg-teal-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                ES
              </button>
            </div>
          )}
          
          {currentView !== 'overview' && currentView !== 'admin' && (
            <button 
              onClick={() => setCurrentView('overview')}
              className="text-xs font-bold text-teal-600 uppercase tracking-widest"
            >
              {t.home}
            </button>
          )}
        </div>
      </header>

      <main className={`${currentView === 'admin' ? 'max-w-5xl' : 'max-w-lg'} mx-auto px-6 pt-4`}>
        <AnimatePresence mode="wait">
          {error === 'expired' && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6">
                <Clock size={40} className="text-amber-500" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{t.expired}</h2>
              <p className="text-slate-500 max-w-xs mx-auto">
                For security, project links expire 24 hours after completion. Please contact your installer if you need further assistance.
              </p>
            </motion.div>
          )}

          {currentView === 'overview' && token && assistantData && error !== 'expired' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {/* Mascot & Message */}
              <div className="flex flex-col items-center text-center py-4">
                <Mascot size="lg" />
                <div className="mt-8 bg-white p-6 rounded-3xl shadow-sm border border-teal-50 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-t border-l border-teal-50 rotate-45" />
                  <p className="text-lg font-medium text-slate-800 leading-relaxed">
                    {data.customer_message}
                  </p>
                </div>
              </div>

              {/* Status Summary */}
              <div className="bg-teal-600 text-white p-5 rounded-2xl shadow-lg shadow-teal-100 flex items-center gap-4">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <p className="text-sm font-semibold leading-tight">{data.status_summary}</p>
              </div>

              {/* Navigation Buttons */}
              <div className="grid gap-3">
                <NavButton 
                  icon={<ArrowRight className="text-teal-500" size={20} />}
                  label={t.next}
                  onClick={() => setCurrentView('next')}
                  trackEvent={trackEvent}
                />
                {data.quote_total && data.quote_total !== "Not available yet." && (
                  <NavButton 
                    icon={<DollarSign className="text-amber-500" size={20} />}
                    label={t.costs}
                    onClick={() => setCurrentView('costs')}
                    trackEvent={trackEvent}
                  />
                )}
                <NavButton 
                  icon={<List className="text-indigo-500" size={20} />}
                  label={t.details}
                  onClick={() => setCurrentView('details')}
                  trackEvent={trackEvent}
                />
                <NavButton 
                  icon={<AlertCircle className="text-teal-500" size={20} />}
                  label={t.faq}
                  onClick={() => setCurrentView('faq')}
                  trackEvent={trackEvent}
                />
                <NavButton 
                  icon={<MessageSquare className="text-teal-600" size={20} />}
                  label={t.messageInstaller}
                  onClick={() => setCurrentView('messaging')}
                  badge={threadData?.unreadForCustomer}
                  trackEvent={trackEvent}
                />
              </div>
            </motion.div>
          )}

          {currentView === 'next' && (
            <DetailView title={t.next} onBack={() => setCurrentView('overview')}>
              <div className="bg-white rounded-3xl p-8 border border-teal-50 shadow-sm space-y-6">
                {data.what_happens_next.map((item, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <div className="mt-1 w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                      <ChevronRight size={14} className="text-teal-600" />
                    </div>
                    <p className="text-slate-600 text-sm leading-relaxed">{item}</p>
                  </div>
                ))}
                {data.needs_info.length > 0 && (
                  <div className="pt-6 border-t border-slate-50">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{t.waiting}</h4>
                    <div className="space-y-3">
                      {data.needs_info.map((item, i) => (
                        <div key={i} className="flex gap-3 items-center text-slate-500 text-xs italic">
                          <Clock size={12} />
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </DetailView>
          )}

          {currentView === 'costs' && (
            <DetailView title={t.costs} onBack={() => setCurrentView('overview')}>
              <div className="bg-white rounded-3xl p-8 border border-teal-50 shadow-sm">
                <div className="mb-8 text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Total</span>
                  <span className="text-4xl font-bold text-teal-600">{data.quote_total}</span>
                </div>
                <div className="space-y-3 border-t border-slate-50 pt-6">
                  {data.quote_items.map((item, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-teal-200 shrink-0" />
                      <span className="text-sm text-slate-600 leading-tight">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </DetailView>
          )}

          {currentView === 'details' && (
            <DetailView title={t.details} onBack={() => setCurrentView('overview')}>
              <div className="bg-white rounded-3xl p-8 border border-teal-50 shadow-sm grid gap-6">
                {data.key_details.map((item, i) => (
                  <div key={i} className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {item.split(':')[0]}
                    </span>
                    <span className="text-sm text-slate-700 font-medium">
                      {item.split(':')[1] || 'Not specified'}
                    </span>
                  </div>
                ))}
              </div>
            </DetailView>
          )}

          {currentView === 'faq' && (
            <DetailView title={t.faq} onBack={() => setCurrentView('overview')}>
              <div className="space-y-3">
                <FAQAccordion language={language} />
              </div>
            </DetailView>
          )}

          {currentView === 'messaging' && (
            <DetailView title={t.messaging} onBack={() => setCurrentView('overview')}>
              <div className="flex flex-col h-[60vh] bg-white rounded-3xl border border-teal-50 shadow-sm overflow-hidden">
                {/* Messages List */}
                <div className="flex-1 relative overflow-hidden bg-slate-50/30">
                  <div 
                    ref={chatContainerRef}
                    onScroll={handleScroll}
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
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                </div>
                                <span className={`text-[9px] mt-1 font-bold uppercase tracking-wider ${msg.senderType === 'customer' ? 'text-right text-teal-600' : 'text-left text-slate-400'}`}>
                                  {msg.senderType === 'customer' ? '(You)' : '(Installer)'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={chatEndRef} />
                      </>
                    )}
                  </div>
                  
                  <AnimatePresence>
                    {showScrollDown && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        onClick={() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="absolute bottom-4 right-6 w-10 h-10 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition-colors z-10"
                      >
                        <ChevronDown size={20} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-100">
                  {threadStatus === 'closed' ? (
                    <div className="p-3 bg-slate-50 rounded-xl text-center text-xs text-slate-500 italic">
                      {t.closed}
                    </div>
                  ) : (
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
                        className="w-11 h-11 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-sm active:scale-95 disabled:opacity-50 disabled:active:scale-100 transition-all"
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </DetailView>
          )}

          {currentView === 'admin' && (
            <div className="space-y-6 max-w-5xl mx-auto pb-20">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-800">Admin Dashboard</h2>
                <div className="flex items-center gap-4">
                  <select 
                    value={statsRange}
                    onChange={(e) => {
                      const newRange = e.target.value as any;
                      setStatsRange(newRange);
                      fetchAdminStats(newRange);
                    }}
                    className="bg-white border border-teal-100 rounded-lg px-3 py-1.5 text-xs font-bold text-teal-600 focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="today">Today</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="year">This Year</option>
                  </select>
                  <button onClick={() => window.location.href = '/'} className="text-sm text-teal-600 font-bold">Back to App</button>
                </div>
              </div>

              {/* Metrics Cards */}
              {adminStats && (() => {
                const aggregated = aggregateStats(adminStats.stats);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-2xl border border-teal-50 shadow-sm">
                      <div className="flex items-center gap-2 text-red-500 mb-1">
                        <AlertCircle size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Needs Response</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{adminStats?.needsResponse || 0}</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-teal-50 shadow-sm">
                      <div className="flex items-center gap-2 text-teal-500 mb-1">
                        <Users size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Engagement Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{Math.round(aggregated.engagedRate * 100)}%</div>
                      <div className="text-[9px] text-slate-400 mt-1">{aggregated.uniqueOpens} opens / {aggregated.linksSent} links</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-teal-50 shadow-sm">
                      <div className="flex items-center gap-2 text-blue-500 mb-1">
                        <Clock size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Avg Response</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">
                        {aggregated.avgResponseTime < 60 ? `${Math.round(aggregated.avgResponseTime)}s` : `${Math.round(aggregated.avgResponseTime / 60)}m`}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-1">Based on {aggregated.responseTimeCount} replies</div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl border border-teal-50 shadow-sm">
                      <div className="flex items-center gap-2 text-indigo-500 mb-1">
                        <MessageSquare size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Conv. Rate</span>
                      </div>
                      <div className="text-2xl font-bold text-slate-800">{Math.round(aggregated.conversationRate * 100)}%</div>
                      <div className="text-[9px] text-slate-400 mt-1">{aggregated.conversationCount} chats / {aggregated.uniqueOpens} opens</div>
                    </div>
                  </div>
                );
              })()}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white p-6 rounded-3xl border border-teal-50 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-slate-700">Conversations</h3>
                      <div className="relative w-48">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                          type="text" 
                          placeholder="Search..." 
                          value={adminSearchQuery}
                          onChange={(e) => setAdminSearchQuery(e.target.value)}
                          className="w-full bg-slate-50 border-none rounded-lg pl-9 pr-3 py-1.5 text-xs focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-4 border-b border-slate-50 pb-2">
                      <button 
                        onClick={() => setAdminActiveTab('all')}
                        className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${
                          adminActiveTab === 'all' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        All Conversations
                      </button>
                      <button 
                        onClick={() => setAdminActiveTab('needsResponse')}
                        className={`text-[10px] font-bold uppercase tracking-wider pb-1 transition-all ${
                          adminActiveTab === 'needsResponse' ? 'text-teal-600 border-b-2 border-teal-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        Needs Response ({(Array.isArray(adminThreads) ? adminThreads : []).filter(t => t.needsResponse && t.status === 'open').length})
                      </button>
                    </div>
                    
                    <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                      {(Array.isArray(adminThreads) ? adminThreads : [])
                        .filter(t => {
                          const matchesSearch = (t.customerName?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase()) || 
                                              (t.projectId?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase());
                          const matchesTab = adminActiveTab === 'all' || (t.needsResponse && t.status === 'open');
                          return matchesSearch && matchesTab;
                        }).length === 0 ? (
                        <div className="text-center py-8 text-slate-400 text-sm">No threads found.</div>
                      ) : (
                        (Array.isArray(adminThreads) ? adminThreads : [])
                          .filter(t => {
                            const matchesSearch = (t.customerName?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase()) || 
                                                (t.projectId?.toLowerCase() || '').includes(adminSearchQuery.toLowerCase());
                            const matchesTab = adminActiveTab === 'all' || (t.needsResponse && t.status === 'open');
                            return matchesSearch && matchesTab;
                          })
                          .sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime())
                          .map(t => (
                            <button
                              key={t.id}
                              onClick={() => {
                                fetch(`/api/admin/thread/${t.id}`)
                                  .then(res => res.json())
                                  .then(setAdminSelectedThread)
                                  .catch(err => console.error('Failed to load thread:', err));
                              }}
                              className={`w-full p-4 text-left border-b border-slate-50 transition-all hover:bg-teal-50/30 relative ${
                                adminSelectedThread?.thread?.id === t.id ? 'bg-teal-50/50 border-l-4 border-l-teal-500' : ''
                              }`}
                            >
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-800 text-sm truncate max-w-[140px]">{t.customerName || 'Unknown Customer'}</span>
                                <div className="flex flex-col items-end">
                                  <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                    {new Date(t.lastMessageAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </span>
                                  {(() => {
                                    const diff = Date.now() - new Date(t.lastMessageAt).getTime();
                                    const mins = Math.floor(diff / 60000);
                                    let color = 'text-slate-400';
                                    if (mins >= 60) color = 'text-red-500';
                                    else if (mins >= 15) color = 'text-amber-500';
                                    
                                    if (t.needsResponse && t.status === 'open') {
                                      return (
                                        <div className="flex flex-col items-end mt-1">
                                          <span className={`text-[8px] font-bold uppercase ${color}`}>Waiting on You</span>
                                          <span className={`text-[8px] ${color}`}>{mins < 60 ? `${mins}m` : `${Math.floor(mins/60)}h`}</span>
                                        </div>
                                      );
                                    } else if (t.lastMessageSender === 'installer' && t.status === 'open') {
                                      return (
                                        <span className="text-[8px] font-bold uppercase text-slate-400 mt-1">Waiting on Customer</span>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider truncate">Project: {t.projectId}</span>
                                {t.unreadForInstaller && (
                                  <div className="w-2 h-2 bg-red-500 rounded-full absolute top-4 right-2 shadow-sm" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-2 line-clamp-1 italic">
                                {t.lastMessageSender === 'customer' ? 'Customer: ' : 'You: '}
                                {t.lastMessageText}
                              </p>
                            </button>
                          ))
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  {adminStats && (() => {
                    const aggregated = aggregateStats(adminStats.stats);
                    return (
                      <>
                        <div className="bg-white p-6 rounded-3xl border border-teal-50 shadow-sm space-y-4">
                          <h3 className="font-bold text-slate-700">Top Topics ({statsRange})</h3>
                          <div className="space-y-3">
                            {aggregated.topCategories.length === 0 ? (
                              <div className="text-center py-4 text-slate-400 text-xs italic">No data yet.</div>
                            ) : (
                              aggregated.topCategories.map((cat: any, i: number) => (
                                <div key={i} className="space-y-1">
                                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    <span>{cat.name}</span>
                                    <span>{cat.count}</span>
                                  </div>
                                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-teal-500 rounded-full" 
                                      style={{ width: `${(cat.count / (aggregated.topCategories[0]?.count || 1)) * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-teal-50 shadow-sm space-y-4">
                          <h3 className="font-bold text-slate-700">Tile Performance</h3>
                          <div className="space-y-3">
                            {Object.entries(aggregated.tileClicks).length === 0 ? (
                              <div className="text-center py-4 text-slate-400 text-xs italic">No clicks tracked.</div>
                            ) : (
                              Object.entries(aggregated.tileClicks)
                                .sort((a, b) => b[1] - a[1])
                                .map(([name, count], i) => (
                                  <div key={i} className="flex justify-between items-center">
                                    <span className="text-xs text-slate-600">{name}</span>
                                    <span className="bg-teal-50 text-teal-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{count}</span>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              {adminSelectedThread && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
                  <motion.div 
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                  >
                    <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                      <div>
                        <h3 className="font-bold text-slate-800">{adminSelectedThread.thread.customerName || 'Customer Chat'}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">Project: {adminSelectedThread.thread.projectId}</p>
                          <span className="text-[10px] text-slate-300">•</span>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                            Last activity: {(() => {
                              const diff = Date.now() - new Date(adminSelectedThread.thread.lastMessageAt).getTime();
                              const mins = Math.floor(diff / 60000);
                              if (mins < 1) return 'Just now';
                              if (mins < 60) return `${mins}m ago`;
                              if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
                              return `${Math.floor(mins/1440)}d ago`;
                            })()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {adminSelectedThread.thread.status === 'open' && (
                          <button
                            onClick={async () => {
                              if (!confirm('Mark this project as complete? This will close the thread and expire the link in 24 hours.')) return;
                              try {
                                const res = await fetch(`/api/admin/complete/${adminSelectedThread.thread.id}`, { method: 'POST' });
                                const data = await res.json();
                                if (data.success) {
                                  setAdminSelectedThread((prev: any) => ({ ...prev, thread: data.thread }));
                                }
                              } catch (err) {
                                console.error('Failed to complete project:', err);
                              }
                            }}
                            className="px-3 py-1.5 bg-teal-600 text-white text-[10px] font-bold rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={12} />
                            MARK COMPLETE
                          </button>
                        )}
                        <button 
                          onClick={() => setAdminSelectedThread(null)}
                          className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600"
                        >
                          <ChevronLeft size={16} />
                        </button>
                      </div>
                    </div>
                    
                    {/* Waiting On Banner */}
                    {(() => {
                      const thread = adminSelectedThread.thread;
                      const diff = Date.now() - new Date(thread.lastMessageAt).getTime();
                      const hours = diff / 3600000;
                      const isOverdue = hours > 24;
                      
                      const relativeTime = (() => {
                        const mins = Math.floor(diff / 60000);
                        if (mins < 1) return 'Just now';
                        if (mins < 60) return `${mins}m ago`;
                        if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
                        return `${Math.floor(mins/1440)}d ago`;
                      })();

                      if (thread.needsResponse || thread.lastMessageSender === 'customer') {
                        return (
                          <div className={`px-4 py-2 flex items-center justify-between ${isOverdue ? 'bg-red-50 border-b border-red-100' : 'bg-amber-50 border-b border-amber-100'}`}>
                            <div className="flex items-center gap-2">
                              <AlertCircle size={14} className={isOverdue ? 'text-red-500' : 'text-amber-500'} />
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${isOverdue ? 'text-red-600' : 'text-amber-600'}`}>
                                Waiting on you
                              </span>
                            </div>
                            <span className={`text-[10px] font-medium ${isOverdue ? 'text-red-500 font-bold animate-pulse' : 'text-amber-500'}`}>
                              {isOverdue ? 'Overdue: ' : 'Last customer message: '}{relativeTime}
                            </span>
                          </div>
                        );
                      } else if (thread.lastMessageSender === 'installer') {
                        return (
                          <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 size={14} className="text-emerald-500" />
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                                Waiting on customer
                              </span>
                            </div>
                            <span className="text-[10px] font-medium text-emerald-500">
                              You replied: {relativeTime}
                            </span>
                          </div>
                        );
                      } else {
                        return (
                          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-center">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              No messages yet
                            </span>
                          </div>
                        );
                      }
                    })()}

                    <div className="flex-1 relative overflow-hidden bg-slate-50/30 min-h-[300px]">
                      <div 
                        onScroll={handleAdminScroll}
                        className="absolute inset-0 overflow-y-auto p-4 space-y-4"
                      >
                        {adminSelectedThread.messages.length === 0 ? (
                          <div className="text-center py-10 text-slate-400 text-sm italic">No messages yet.</div>
                        ) : (
                          adminSelectedThread.messages.map((msg: any, i: number) => (
                            <div key={i} className={`flex ${msg.senderType === 'customer' ? 'justify-start' : 'justify-end'}`}>
                              <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                                msg.senderType === 'customer' 
                                  ? 'bg-white border border-slate-100 text-slate-700 rounded-bl-none' 
                                  : 'bg-teal-600 text-white rounded-br-none'
                              }`}>
                                {msg.body}
                                <div className={`text-[9px] mt-1 opacity-60 ${msg.senderType === 'customer' ? 'text-slate-400' : 'text-teal-100'}`}>
                                  {new Date(msg.createdAt).toLocaleTimeString()}
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                        <div ref={adminChatEndRef} />
                      </div>

                      <AnimatePresence>
                        {adminShowScrollDown && (
                          <motion.button
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            onClick={() => adminChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })}
                            className="absolute bottom-4 right-6 w-10 h-10 bg-teal-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition-colors z-10"
                          >
                            <ChevronDown size={20} />
                          </motion.button>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    <div className="p-4 bg-white border-t border-slate-100">
                      {/* Quick Replies */}
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-1 no-scrollbar">
                        {[
                          "We're reviewing your site survey.",
                          "Can you confirm availability?",
                          "Your install is scheduled for [date].",
                          "We'll send your quote shortly.",
                          "We'll call you shortly."
                        ].map((reply, i) => (
                          <button
                            key={i}
                            onClick={() => setAdminReply(reply)}
                            className="whitespace-nowrap px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-full text-[10px] font-medium text-slate-600 hover:bg-teal-50 hover:border-teal-100 hover:text-teal-600 transition-all"
                          >
                            {reply}
                          </button>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <textarea
                          placeholder="Type an internal reply..."
                          value={adminReply}
                          onChange={(e) => setAdminReply(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              const btn = e.currentTarget.parentElement?.querySelector('button');
                              btn?.click();
                            }
                          }}
                          disabled={adminSending}
                          className="flex-1 bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-teal-500 resize-none h-[44px]"
                          rows={1}
                        />
                        <button
                          disabled={adminSending || !adminReply.trim()}
                          onClick={async () => {
                            if (!adminReply.trim() || adminSending) return;
                            setAdminSending(true);
                            try {
                              console.log('[Admin] Sending message to thread:', adminSelectedThread.thread.id);
                              const res = await fetch(`/api/admin/message/${adminSelectedThread.thread.id}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ body: adminReply })
                              });
                              
                              if (!res.ok) {
                                throw new Error('Failed to send message');
                              }
                              
                              setAdminReply('');
                              // Refresh thread data
                              const refreshRes = await fetch(`/api/admin/thread/${adminSelectedThread.thread.id}`);
                              const refreshedData = await refreshRes.json();
                              setAdminSelectedThread(refreshedData);
                              console.log('[Admin] Message sent and thread refreshed');
                            } catch (err) {
                              console.error('[Admin] Error sending message:', err);
                              alert('Failed to send message. Please try again.');
                            } finally {
                              setAdminSending(false);
                            }
                          }}
                          className={`w-11 h-11 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all ${
                            adminSending || !adminReply.trim() ? 'bg-slate-200 text-slate-400' : 'bg-teal-600 text-white'
                          }`}
                        >
                          {adminSending ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Send size={18} />
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function FAQAccordion({ language }: { language: 'English' | 'Spanish' }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: {
        en: "What happens during an installation?",
        es: "¿Qué sucede durante una instalación?"
      },
      a: {
        en: "The electrician will review the plan, run wiring from your panel, mount the charger, and test everything to ensure it's working perfectly.",
        es: "El electricista revisará el plan, instalará el cableado desde su panel, montará el cargador y probará todo para asegurarse de que funcione perfectamente."
      }
    },
    {
      q: {
        en: "How should I prepare for my electrician?",
        es: "¿Cómo debo prepararme para mi electricista?"
      },
      a: {
        en: "Please clear the area around your electrical panel and charger location, secure any pets in another room, and have your WiFi password ready.",
        es: "Despeje el área alrededor de su panel eléctrico y la ubicación del cargador, asegure a sus mascotas en otra habitación y tenga lista su contraseña de WiFi."
      }
    },
    {
      q: {
        en: "How long does the installation take?",
        es: "¿Cuánto tiempo toma la instalación?"
      },
      a: {
        en: "Most standard home installations take between 2 to 4 hours, depending on the distance from your electrical panel to the charger.",
        es: "La mayoría de las instalaciones domésticas estándar toman entre 2 y 4 horas, dependiendo de la distancia desde su panel eléctrico hasta el cargador."
      }
    },
    {
      q: {
        en: "Do I need to be home for the installation?",
        es: "¿Debo estar en casa para la instalación?"
      },
      a: {
        en: "Yes, someone over 18 needs to be present to provide access to the electrical panel and confirm the final placement of the charger.",
        es: "Sí, alguien mayor de 18 años debe estar presente para facilitar el acceso al panel eléctrico y confirmar la ubicación final del cargador."
      }
    },
    {
      q: {
        en: "Can I use my charger in the rain?",
        es: "¿Puedo usar mi cargador bajo la lluvia?"
      },
      a: {
        en: "Absolutely. Home chargers are designed to be weather-resistant and safe for outdoor use in all conditions, including rain and snow.",
        es: "Absolutamente. Los cargadores domésticos están diseñados para ser resistentes a la intemperie y seguros para su uso en exteriores en todas las condiciones, incluyendo lluvia y nieve."
      }
    },
    {
      q: {
        en: "What is a 'Smart' charger?",
        es: "¿Qué es un cargador 'Inteligente'?"
      },
      a: {
        en: "A smart charger connects to your WiFi, allowing you to schedule charging during off-peak hours to save money and monitor your energy usage via an app.",
        es: "Un cargador inteligente se conecta a su WiFi, lo que le permite programar la carga durante las horas de menor demanda para ahorrar dinero y monitorear su uso de energía a través de una aplicación."
      }
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

function NavButton({ icon, label, onClick, badge, trackEvent }: { icon: ReactNode, label: string, onClick: () => void, badge?: boolean, trackEvent?: (e: string, t: string) => void }) {
  return (
    <button 
      onClick={() => {
        if (trackEvent) trackEvent('tile_click', label);
        onClick();
      }}
      className="w-full bg-white p-5 rounded-2xl shadow-sm border border-teal-50 flex items-center justify-between group hover:border-teal-200 transition-all active:scale-[0.98] relative"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
          {icon}
        </div>
        <span className="font-semibold text-slate-700">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <ChevronRight className="text-slate-300 group-hover:text-teal-500 transition-colors" size={20} />
      </div>
      {badge && (
        <div className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full shadow-sm border-2 border-white" />
      )}
    </button>
  );
}

function DetailView({ title, children, onBack }: { title: string, children: ReactNode, onBack: () => void }) {
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

function Mascot({ size = 'md', animate = false }: { size?: 'sm' | 'md' | 'lg', animate?: boolean }) {
  const dimensions = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  return (
    <motion.div 
      className={`${dimensions[size]} relative`}
      animate={animate ? { y: [0, -10, 0] } : {}}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    >
      {/* Friendly EV Charger Mascot "Jumpy" */}
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-xl">
        {/* Body */}
        <rect x="20" y="30" width="60" height="60" rx="12" fill="#0D9488" />
        <rect x="25" y="35" width="50" height="50" rx="8" fill="#14B8A6" />
        
        {/* Screen/Face Area */}
        <rect x="32" y="42" width="36" height="24" rx="4" fill="#F0FDFA" />
        
        {/* Eyes */}
        <motion.circle 
          cx="42" cy="52" r="3" fill="#0F172A" 
          animate={{ scaleY: [1, 0.1, 1] }} 
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.95, 1] }}
        />
        <motion.circle 
          cx="58" cy="52" r="3" fill="#0F172A" 
          animate={{ scaleY: [1, 0.1, 1] }} 
          transition={{ repeat: Infinity, duration: 3, times: [0, 0.95, 1] }}
        />
        
        {/* Smile */}
        <path d="M44 60C44 60 47 62 50 62C53 62 56 60 56 60" stroke="#0F172A" strokeWidth="2" strokeLinecap="round" />
        
        {/* Plug Tail */}
        <path d="M80 75C85 75 90 70 90 65V55" stroke="#0D9488" strokeWidth="4" strokeLinecap="round" />
        <rect x="85" y="45" width="10" height="10" rx="2" fill="#0D9488" />
        <rect x="88" y="40" width="1" height="5" fill="#94A3B8" />
        <rect x="91" y="40" width="1" height="5" fill="#94A3B8" />
        
        {/* Zap Icon on Chest */}
        <path d="M50 72L47 80H53L50 88" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </motion.div>
  );
}
