'use client';

import { useEffect, useState, createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Package, ShieldCheck,
  X, Landmark, Receipt, MapPin, Search, Menu, Camera, LogOut, Eye, Loader2, CheckCircle, AlertCircle, Info, AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

// ======================== SISTEMA DE TOASTS (solo lectura) ========================
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<{
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {},
});

export const useToast = () => useContext(ToastContext);

function ToastContainer() {
  const { toasts, removeToast } = useContext(ToastContext);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getBgColor = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      case 'error': return 'bg-red-50 border-red-200 text-red-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-[1000] space-y-2">
      <AnimatePresence>
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border ${getBgColor(toast.type)} min-w-[280px] max-w-md`}
          >
            {getIcon(toast.type)}
            <p className="text-sm font-medium flex-1">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ======================== COMPONENTE PRINCIPAL PARA ESPECTADOR ========================
export default function EspectadorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Panel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profileData) {
        console.error('Error obteniendo perfil:', error);
        return router.push('/login');
      }
      
      if (profileData.role !== 'espectador') {
        router.push('/login');
        return;
      }
      
      setProfile(profileData);
      fetchData();
    };
    checkAuth();
    return () => clearInterval(timer);
  }, []);

  async function fetchData() {
    setLoading(true);
    const { data: itemsData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    const { data: ubiData } = await supabase.from('ubicaciones').select('*').order('nombre');
    
    setItems(itemsData || []);
    setUbicaciones(ubiData || []);
    setLoading(false);
  }

  const getProxyImageUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    if (originalUrl.includes('drive.google.com')) {
      const fileIdMatch = originalUrl.match(/[-\w]{25,}/);
      if (fileIdMatch) return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    return originalUrl;
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ======================== GRÁFICOS (solo lectura) ========================
  const tipoContableData = () => {
    const activos = items.filter(i => i.tipo_contable === 'Activo').length;
    const pasivos = items.filter(i => i.tipo_contable === 'Pasivo').length;
    const patrimonio = items.filter(i => i.tipo_contable === 'Patrimonio').length;
    return [
      { name: 'Activos', value: activos, color: '#2D1B69' },
      { name: 'Pasivos', value: pasivos, color: '#FFD700' },
      { name: 'Patrimonio', value: patrimonio, color: '#10b981' },
    ].filter(d => d.value > 0);
  };

  const categoriasData = () => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const cat = item.categoria || 'Sin categoría';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 18) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, isMobile ? 5 : 8);
  };

  const responsablesData = () => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const resp = item.responsable_nombre || 'Sin responsable';
      counts[resp] = (counts[resp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 18) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, isMobile ? 4 : 5);
  };

  const ubicacionesData = () => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const ubi = item.ubicacion || 'Sin ubicación';
      counts[ubi] = (counts[ubi] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name: name.length > 20 ? name.substring(0, 18) + '…' : name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, isMobile ? 4 : 5);
  };

  // ======================== RENDER (JSX) ========================
  if (!mounted) return null;

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
        <ToastContainer />
        
        <aside 
          className={`fixed inset-y-0 left-0 z-[100] w-72 bg-[#2D1B69] transform transition-transform duration-300 flex flex-col overflow-y-auto ${
            isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
          } md:translate-x-0`}
        >
          <div className="flex items-center justify-between p-6 text-white flex-shrink-0">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-[#FFD700]" size={28} />
              <span className="font-black italic text-xl tracking-tighter uppercase">INV-CORE</span>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 hover:bg-white/10 rounded-full">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-2">
            {[
              { id: 'Panel', icon: <LayoutDashboard size={18} />, label: 'Panel' },
              { id: 'Inventario', icon: <Package size={18} />, label: 'Inventario' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { 
                  setActiveTab(tab.id); 
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
                  activeTab === tab.id 
                    ? 'bg-[#FFD700] text-[#2D1B69]' 
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          <div className="p-4 mt-auto flex-shrink-0">
            <button onClick={() => { setIsMobileMenuOpen(false); handleLogout(); }} className="w-full flex items-center gap-4 px-5 py-4 rounded-xl text-[11px] font-bold uppercase tracking-wider text-white/50 hover:text-red-300 hover:bg-red-500/10 transition-all border border-red-500/20">
              <LogOut size={18} /> Cerrar Sesión
            </button>
          </div>
        </aside>

        <main className="flex-1 ml-0 md:ml-72 h-screen overflow-y-auto">
          <div className="p-4 md:p-8">
            <header className="bg-white rounded-2xl p-5 mb-6 flex justify-between items-center shadow-sm border border-slate-100">
              <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-[#2D1B69] p-2 bg-slate-50 rounded-lg"><Menu /></button>
              <div className="hidden sm:block">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel Espectador</p>
                <h2 className="text-[#2D1B69] font-black">{profile?.full_name || 'Espectador'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{now.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                  <p className="font-mono font-bold text-[#B08A00]">{now.toLocaleTimeString()}</p>
                </div>
              </div>
            </header>

            {/* PANEL (solo gráficos, sin acciones) */}
            {activeTab === 'Panel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="bg-[#2D1B69] text-white p-8 rounded-2xl shadow-lg flex justify-between items-center">
                    <div><p className="text-[9px] font-black uppercase opacity-60">Activos</p><h3 className="text-4xl font-black">{items.filter(i => i.tipo_contable === 'Activo').length}</h3></div>
                    <div className="opacity-20 scale-[2]"><Landmark /></div>
                  </div>
                  <div className="bg-[#FFD700] text-[#2D1B69] p-8 rounded-2xl shadow-lg flex justify-between items-center">
                    <div><p className="text-[9px] font-black uppercase opacity-60">Pasivos</p><h3 className="text-4xl font-black">{items.filter(i => i.tipo_contable === 'Pasivo').length}</h3></div>
                    <div className="opacity-20 scale-[2]"><Receipt /></div>
                  </div>
                  <div className="bg-white text-[#2D1B69] p-8 rounded-2xl shadow-lg flex justify-between items-center">
                    <div><p className="text-[9px] font-black uppercase opacity-60">Ubicaciones</p><h3 className="text-4xl font-black">{ubicaciones.length}</h3></div>
                    <div className="opacity-20 scale-[2]"><MapPin /></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-[#2D1B69] mb-4 text-lg">Distribución por Tipo Contable</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie data={tipoContableData()} cx="50%" cy="50%" innerRadius={isMobile ? 40 : 60} outerRadius={isMobile ? 70 : 100} dataKey="value" label={({ name, percent }) => { const pct = percent ?? 0; return isMobile ? `${(pct * 100).toFixed(0)}%` : `${name}: ${(pct * 100).toFixed(0)}%`; }}>
                          {tipoContableData().map((entry, idx) => (<Cell key={idx} fill={entry.color} />))}
                        </Pie>
                        <Tooltip /><Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-[#2D1B69] mb-4 text-lg">Top 5 Responsables</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={responsablesData()} layout={isMobile ? "horizontal" : "vertical"} margin={{ left: isMobile ? 0 : 80, bottom: isMobile ? 50 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {isMobile ? (<><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} /><YAxis type="number" /></>) : (<><XAxis type="number" /><YAxis type="category" dataKey="name" width={80} /></>)}
                        <Tooltip /><Bar dataKey="value" fill="#2D1B69" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-[#2D1B69] mb-4 text-lg">Top 5 Ubicaciones</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={ubicacionesData()} layout={isMobile ? "horizontal" : "vertical"} margin={{ left: isMobile ? 0 : 100, bottom: isMobile ? 50 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {isMobile ? (<><XAxis dataKey="name" angle={-45} textAnchor="end" height={80} /><YAxis type="number" /></>) : (<><XAxis type="number" /><YAxis type="category" dataKey="name" width={100} /></>)}
                        <Tooltip /><Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-[#2D1B69] mb-4 text-lg">Top Categorías</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={categoriasData()} layout={isMobile ? "horizontal" : "vertical"} margin={{ left: isMobile ? 0 : 120, bottom: isMobile ? 80 : 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        {isMobile ? (<><XAxis dataKey="name" angle={-45} textAnchor="end" height={100} interval={0} /><YAxis type="number" /></>) : (<><XAxis type="number" /><YAxis type="category" dataKey="name" width={120} /></>)}
                        <Tooltip /><Bar dataKey="value" fill="#f97316" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {/* INVENTARIO (solo lectura, sin botones de acción) */}
            {activeTab === 'Inventario' && (
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6 flex flex-wrap gap-4 justify-between bg-slate-50/50">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar por nombre, código, responsable, ubicación o fecha..." className="w-full pl-12 pr-4 py-3.5 border-none bg-white rounded-xl text-sm shadow-sm" onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-5 text-center">Imagen</th><th className="p-5">Código</th><th className="p-5">Artículo</th><th className="p-5">Responsable</th><th className="p-5">Ubicación</th><th className="p-5 text-center">Stock</th><th className="p-5">Fecha Adq.</th></tr></thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {items.filter(i => { const term = searchTerm.toLowerCase().trim(); if (term === '') return true; const fechaStr = i.fecha_adquisicion ? new Date(i.fecha_adquisicion).toLocaleDateString('es-EC') : ''; const fechaOriginal = i.fecha_adquisicion || ''; return (i.nombre?.toLowerCase().includes(term) || i.codigo?.toLowerCase().includes(term) || i.responsable_nombre?.toLowerCase().includes(term) || i.ubicacion?.toLowerCase().includes(term) || fechaStr.toLowerCase().includes(term) || fechaOriginal.includes(term)); }).map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/80">
                          <td className="p-4 flex justify-center">{item.imagen_url ? <img src={getProxyImageUrl(item.imagen_url)} className="w-10 h-10 object-cover rounded-lg" alt={item.nombre} /> : <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center"><Camera size={14} /></div>}</td>
                          <td className="p-5 font-mono font-bold text-[#2D1B69] text-xs">{item.codigo}</td>
                          <td className="p-5"><div className="font-bold text-slate-800">{item.nombre}</div><div className="text-[9px] text-slate-400 uppercase">{item.categoria}</div>{item.observaciones && <div className="text-[9px] text-slate-500 mt-1">{item.observaciones.substring(0, 50)}</div>}</td>
                          <td className="p-5"><span className="text-xs text-indigo-600 font-bold">{item.responsable_nombre || 'Sin responsable'}</span></td>
                          <td className="p-5"><span className="text-xs text-slate-600 italic">{item.ubicacion}</span></td>
                          <td className="p-5 text-center font-black text-[#2D1B69]">{item.stock}</td>
                          <td className="p-5 text-xs text-slate-500">{item.fecha_adquisicion || '---'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ToastContext.Provider>
  );
}