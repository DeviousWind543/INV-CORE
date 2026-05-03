'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Package, ShieldCheck,
  X, MapPin, Landmark, Receipt, Search, Menu, LogOut, Camera, Eye, EyeOff, Loader2, Clock, CheckCircle, AlertCircle, Info, AlertTriangle
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import ImageViewer from '@/components/ImageViewer';

// ======================== SISTEMA DE TOASTS ========================
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

// ======================== COMPONENTE PRINCIPAL ========================
export default function EspectadorDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Panel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(new Date());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [countedActivos, setCountedActivos] = useState(0);
  const [countedPasivos, setCountedPasivos] = useState(0);
  
  // Estados para el visor de imágenes
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    nombre: string;
    codigo?: string;
    categoria?: string;
    ubicacion?: string;
    responsable?: string;
    estado?: string;
    stock?: number;
  } | null>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  // Animación de contadores
  useEffect(() => {
    const targetActivos = items.filter(i => i.tipo_contable === 'Activo').length;
    const targetPasivos = items.filter(i => i.tipo_contable === 'Pasivo').length;
    
    const duration = 1000;
    const startTime = performance.now();
    const startActivos = 0;
    const startPasivos = 0;
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setCountedActivos(Math.floor(startActivos + (targetActivos - startActivos) * easeOutQuart));
      setCountedPasivos(Math.floor(startPasivos + (targetPasivos - startPasivos) * easeOutQuart));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [items]);

  const getProxyImageUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    if (originalUrl.includes('drive.google.com')) {
      const fileIdMatch = originalUrl.match(/[-\w]{25,}/);
      if (fileIdMatch) return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    return originalUrl;
  };

  const openImageViewer = (item: any) => {
    const imageUrl = getProxyImageUrl(item.imagen_url);
    if (!imageUrl || imageUrl.trim() === '') {
      addToast('Este artículo no tiene una imagen válida', 'warning');
      return;
    }
    setSelectedImage({
      url: imageUrl,
      nombre: item.nombre,
      codigo: item.codigo,
      categoria: item.categoria,
      ubicacion: item.ubicacion,
      responsable: item.responsable_nombre,
      estado: item.estado,
      stock: item.stock
    });
    setImageViewerOpen(true);
  };

  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setNow(new Date()), 1000);
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push('/login');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile) {
        console.error('Error obteniendo perfil:', error);
        return router.push('/login');
      }
      
      if (profile.role !== 'espectador') {
        if (profile.role === 'admin') router.push('/admin/dashboard');
        else if (profile.role === 'encargado') router.push('/Encargado');
        else router.push('/login');
        return;
      }
      
      setAdminProfile(profile);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // Datos para gráficos
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
      .map(([name, value]) => ({ 
        name: name.length > (isMobile ? 15 : 20) ? name.substring(0, (isMobile ? 12 : 18)) + '…' : name, 
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, isMobile ? 4 : 5);
  };

  const responsablesData = () => {
    const counts: Record<string, number> = {};
    items.forEach(item => {
      const resp = item.responsable_nombre || 'Sin responsable';
      counts[resp] = (counts[resp] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ 
        name: name.length > (isMobile ? 15 : 20) ? name.substring(0, (isMobile ? 12 : 18)) + '…' : name, 
        value 
      }))
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
      .map(([name, value]) => ({ 
        name: name.length > (isMobile ? 15 : 20) ? name.substring(0, (isMobile ? 12 : 18)) + '…' : name, 
        value 
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, isMobile ? 4 : 5);
  };

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
              { id: 'Inventario', icon: <Package size={18} />, label: 'Inventario' },
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
                <h2 className="text-[#2D1B69] font-black">{adminProfile?.full_name || 'Espectador'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{now.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                  <p className="font-mono font-bold text-[#B08A00]">{now.toLocaleTimeString()}</p>
                </div>
              </div>
            </header>

            {/* PANEL */}
            {activeTab === 'Panel' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="bg-[#2D1B69] text-white p-5 md:p-8 rounded-2xl shadow-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[8px] md:text-[9px] font-black uppercase opacity-60">Activos</p>
                      <motion.h3 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        className="text-2xl md:text-4xl font-black font-mono"
                      >
                        {countedActivos}
                      </motion.h3>
                    </div>
                    <div className="opacity-20 scale-[1.5] md:scale-[2]"><Landmark /></div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: 0.2 }}
                    className="bg-[#FFD700] text-[#2D1B69] p-5 md:p-8 rounded-2xl shadow-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="text-[8px] md:text-[9px] font-black uppercase opacity-60">Pasivos</p>
                      <motion.h3 
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.3, delay: 0.3 }}
                        className="text-2xl md:text-4xl font-black font-mono"
                      >
                        {countedPasivos}
                      </motion.h3>
                    </div>
                    <div className="opacity-20 scale-[1.5] md:scale-[2]"><Receipt /></div>
                  </motion.div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.4 }}
                    className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200"
                  >
                    <h3 className="font-bold text-[#2D1B69] mb-3 md:mb-4 text-base md:text-lg">Distribución por Tipo Contable</h3>
                    <div style={{ width: '100%', height: isMobile ? 280 : 300, position: 'relative' }}>
                      {items.length > 0 && tipoContableData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie 
                              data={tipoContableData()} 
                              cx="50%" 
                              cy="45%" 
                              innerRadius={isMobile ? 35 : 60} 
                              outerRadius={isMobile ? 60 : 100} 
                              dataKey="value" 
                              labelLine={false}
                              label={({ name, percent }) => { 
                                const pct = percent ?? 0; 
                                if (isMobile) {
                                  return `${(pct * 100).toFixed(0)}%`;
                                }
                                return `${name}: ${(pct * 100).toFixed(0)}%`;
                              }}
                              fontSize={isMobile ? 10 : 12}
                              animationBegin={400}
                              animationDuration={800}
                              animationEasing="ease-out"
                              isAnimationActive={true}
                            >
                              {tipoContableData().map((entry, idx) => (
                                <Cell 
                                  key={`cell-${idx}`} 
                                  fill={entry.color}
                                  style={{ animation: `fadeIn 0.5s ease-out ${idx * 0.1}s both` }}
                                />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value) => [`${value} items`, 'Cantidad']}
                              animationDuration={200}
                            />
                            <Legend 
                              verticalAlign="bottom" 
                              height={isMobile ? 40 : 36}
                              wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl">
                          <p className="text-xs md:text-sm">Cargando datos...</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.5 }}
                    className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200"
                  >
                    <h3 className="font-bold text-[#2D1B69] mb-3 md:mb-4 text-base md:text-lg">Top 5 Responsables</h3>
                    <div style={{ width: '100%', height: isMobile ? 280 : 300, position: 'relative' }}>
                      {items.length > 0 && responsablesData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={responsablesData()} 
                            layout="vertical"
                            margin={{ 
                              left: isMobile ? 50 : 80, 
                              right: isMobile ? 10 : 20, 
                              top: isMobile ? 10 : 20, 
                              bottom: isMobile ? 10 : 20 
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={isMobile ? 50 : 80} 
                              tick={{ fontSize: isMobile ? 9 : 12 }}
                              interval={0}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} items`, 'Cantidad']}
                              animationDuration={200}
                            />
                            <Bar 
                              dataKey="value" 
                              fill="#2D1B69" 
                              radius={[0, 4, 4, 0]}
                              animationBegin={500}
                              animationDuration={800}
                              animationEasing="ease-out"
                              isAnimationActive={true}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl">
                          <p className="text-xs md:text-sm">Cargando datos...</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                    className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200"
                  >
                    <h3 className="font-bold text-[#2D1B69] mb-3 md:mb-4 text-base md:text-lg">Top 5 Ubicaciones</h3>
                    <div style={{ width: '100%', height: isMobile ? 280 : 300, position: 'relative' }}>
                      {items.length > 0 && ubicacionesData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={ubicacionesData()} 
                            layout="vertical"
                            margin={{ 
                              left: isMobile ? 70 : 100, 
                              right: isMobile ? 10 : 20, 
                              top: isMobile ? 10 : 20, 
                              bottom: isMobile ? 10 : 20 
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={isMobile ? 70 : 100} 
                              tick={{ fontSize: isMobile ? 9 : 12 }}
                              interval={0}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} items`, 'Cantidad']}
                              animationDuration={200}
                            />
                            <Bar 
                              dataKey="value" 
                              fill="#10b981" 
                              radius={[0, 4, 4, 0]}
                              animationBegin={600}
                              animationDuration={800}
                              animationEasing="ease-out"
                              isAnimationActive={true}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl">
                          <p className="text-xs md:text-sm">Cargando datos...</p>
                        </div>
                      )}
                    </div>
                  </motion.div>

                  <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.7 }}
                    className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200"
                  >
                    <h3 className="font-bold text-[#2D1B69] mb-3 md:mb-4 text-base md:text-lg">Top Categorías</h3>
                    <div style={{ width: '100%', height: isMobile ? 280 : 300, position: 'relative' }}>
                      {items.length > 0 && categoriasData().length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={categoriasData()} 
                            layout="vertical"
                            margin={{ 
                              left: isMobile ? 90 : 120, 
                              right: isMobile ? 10 : 20, 
                              top: isMobile ? 10 : 20, 
                              bottom: isMobile ? 10 : 20 
                            }}
                          >
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: isMobile ? 10 : 12 }} />
                            <YAxis 
                              type="category" 
                              dataKey="name" 
                              width={isMobile ? 90 : 120} 
                              tick={{ fontSize: isMobile ? 8 : 11 }}
                              interval={0}
                            />
                            <Tooltip 
                              formatter={(value) => [`${value} items`, 'Cantidad']}
                              animationDuration={200}
                            />
                            <Bar 
                              dataKey="value" 
                              fill="#f97316" 
                              radius={[0, 4, 4, 0]}
                              animationBegin={700}
                              animationDuration={800}
                              animationEasing="ease-out"
                              isAnimationActive={true}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-400 bg-slate-50 rounded-xl">
                          <p className="text-xs md:text-sm">Cargando datos...</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              </div>
            )}

            {/* INVENTARIO - Versión Desktop (Tabla) */}
            {activeTab === 'Inventario' && !isMobile && (
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                <div className="p-6 flex flex-wrap gap-4 justify-between bg-slate-50/50">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar por nombre, código, responsable, ubicación o fecha..." className="w-full pl-12 pr-4 py-3.5 border-none bg-white rounded-xl text-sm shadow-sm" onChange={e => setSearchTerm(e.target.value)} />
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="p-5 text-center">Imagen</th>
                        <th className="p-5">Código</th>
                        <th className="p-5">Artículo</th>
                        <th className="p-5">Responsable</th>
                        <th className="p-5">Ubicación</th>
                        <th className="p-5 text-center">Stock</th>
                        <th className="p-5">Fecha Adq.</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {items.filter(i => { 
                        const term = searchTerm.toLowerCase().trim(); 
                        if (term === '') return true; 
                        const fechaStr = i.fecha_adquisicion ? new Date(i.fecha_adquisicion).toLocaleDateString('es-EC') : ''; 
                        const fechaOriginal = i.fecha_adquisicion || ''; 
                        return (i.nombre?.toLowerCase().includes(term) || i.codigo?.toLowerCase().includes(term) || i.responsable_nombre?.toLowerCase().includes(term) || i.ubicacion?.toLowerCase().includes(term) || fechaStr.toLowerCase().includes(term) || fechaOriginal.includes(term)); 
                      }).map((item) => {
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/80">
                            <td className="p-4">
                              {item.imagen_url ? (
                                <button
                                  onClick={() => openImageViewer(item)}
                                  className="group relative w-12 h-12 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer"
                                >
                                  <img src={getProxyImageUrl(item.imagen_url)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt={item.nombre} />
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                                    <Camera size={16} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </button>
                              ) : (
                                <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center">
                                  <Camera size={16} className="text-slate-300" />
                                </div>
                              )}
                            </td>
                            <td className="p-5 font-mono font-bold text-[#2D1B69] text-xs">{item.codigo}</td>
                            <td className="p-5">
                              <div className="font-bold text-slate-800">{item.nombre}</div>
                              <div className="text-[9px] text-slate-400 uppercase">{item.categoria}</div>
                              {item.observaciones && <div className="text-[9px] text-slate-500 mt-1">{item.observaciones.substring(0, 50)}</div>}
                            </td>
                            <td className="p-5"><span className="text-xs text-indigo-600 font-bold">{item.responsable_nombre || 'Sin responsable'}</span></td>
                            <td className="p-5"><span className="text-xs text-slate-600 italic">{item.ubicacion}</span></td>
                            <td className="p-5 text-center font-black text-[#2D1B69]">{item.stock}</td>
                            <td className="p-5 text-xs text-slate-500">{item.fecha_adquisicion || '---'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {/* INVENTARIO - Versión Móvil (Tarjetas) */}
            {activeTab === 'Inventario' && isMobile && (
              <div className="space-y-4 p-4">
                <div className="flex flex-col gap-3 mb-4 sticky top-0 bg-slate-50 z-10 p-3 rounded-xl">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar por nombre, código, responsable..." 
                      className="w-full pl-9 pr-3 py-2 border-none bg-white rounded-xl text-sm shadow-sm" 
                      onChange={e => setSearchTerm(e.target.value)} 
                    />
                  </div>
                </div>
                
                {items.filter(i => { 
                  const term = searchTerm.toLowerCase().trim(); 
                  if (term === '') return true; 
                  const fechaStr = i.fecha_adquisicion ? new Date(i.fecha_adquisicion).toLocaleDateString('es-EC') : ''; 
                  const fechaOriginal = i.fecha_adquisicion || ''; 
                  return (i.nombre?.toLowerCase().includes(term) || i.codigo?.toLowerCase().includes(term) || i.responsable_nombre?.toLowerCase().includes(term) || i.ubicacion?.toLowerCase().includes(term) || fechaStr.toLowerCase().includes(term) || fechaOriginal.includes(term)); 
                }).map((item) => {
                  return (
                    <div key={item.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                      <div className="flex p-4 gap-4">
                        <button
                          onClick={() => item.imagen_url && openImageViewer(item)}
                          className="w-20 h-20 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 shadow-sm hover:shadow-md transition-all"
                        >
                          {item.imagen_url ? (
                            <img src={getProxyImageUrl(item.imagen_url)} className="w-full h-full object-cover" alt={item.nombre} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Camera size={24} className="text-slate-300" />
                            </div>
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm line-clamp-2">{item.nombre}</h4>
                              <p className="text-[10px] text-indigo-600 font-mono mt-1">{item.codigo}</p>
                            </div>
                            <span className="text-xs font-black text-[#2D1B69] bg-[#2D1B69]/10 px-2 py-1 rounded-lg">{item.stock}</span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[10px]">
                            <span className="bg-slate-100 px-2 py-1 rounded-lg">{item.categoria}</span>
                            <span className="bg-slate-100 px-2 py-1 rounded-lg">{item.ubicacion}</span>
                            <span className="bg-slate-100 px-2 py-1 rounded-lg">{item.responsable_nombre || 'Sin responsable'}</span>
                          </div>
                          <div className="mt-3 text-xs text-slate-500">
                            {item.observaciones && <span className="line-clamp-2">{item.observaciones}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {items.filter(i => { 
                  const term = searchTerm.toLowerCase().trim(); 
                  if (term === '') return false; 
                  const fechaStr = i.fecha_adquisicion ? new Date(i.fecha_adquisicion).toLocaleDateString('es-EC') : ''; 
                  const fechaOriginal = i.fecha_adquisicion || ''; 
                  return (i.nombre?.toLowerCase().includes(term) || i.codigo?.toLowerCase().includes(term) || i.responsable_nombre?.toLowerCase().includes(term) || i.ubicacion?.toLowerCase().includes(term) || fechaStr.toLowerCase().includes(term) || fechaOriginal.includes(term)); 
                }).length === 0 && searchTerm && (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm">No se encontraron resultados para "{searchTerm}"</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
        
        <ImageViewer
          image={selectedImage}
          isOpen={imageViewerOpen}
          onClose={() => setImageViewerOpen(false)}
        />
      </div>
    </ToastContext.Provider>
  );
}