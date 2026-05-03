'use client';

import { useEffect, useState, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import {
  LayoutDashboard, Package, Users, ShieldCheck,
  Plus, X, MapPin, RefreshCcw, Landmark, Receipt, Trash2, Edit3, Search, Menu, Printer, Camera, Eye, EyeOff, Link, Upload, Loader2, LogOut, Clock, Download, FileText, CheckCircle, AlertCircle, Info, AlertTriangle, Trash
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

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

// ======================== MODAL DE CONFIRMACIÓN ========================
function ConfirmModal({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirmar", cancelText = "Cancelar" }: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl"
      >
        <h3 className="text-xl font-black text-[#2D1B69] mb-2">{title}</h3>
        <p className="text-slate-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition">
            {cancelText}
          </button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition">
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ======================== MANEJADOR DE TOKENS DE DRIVE CON AUTO-REFRESH ========================
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  console.log('🔄 Refrescando token de Drive...');
  
  const response = await fetch('/api/auth/drive/refresh', { method: 'POST' });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Error en refresh:', errorData);
    throw new Error(errorData.error || 'Failed to refresh token');
  }
  
  const data = await response.json();
  const newToken = data.access_token;
  
  if (!newToken) {
    throw new Error('No access_token in response');
  }
  
  localStorage.setItem('drive_access_token', newToken);
  localStorage.setItem('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
  
  console.log('✅ Token refrescado exitosamente');
  return newToken;
}

async function getValidAccessToken(): Promise<string | null> {
  let token = localStorage.getItem('drive_access_token');
  const tokenExpiry = localStorage.getItem('drive_token_expiry');
  const now = Date.now();
  
  if (!token || !tokenExpiry || now > parseInt(tokenExpiry)) {
    console.log('Token no encontrado o expirado, refrescando...');
    if (!refreshPromise) {
      refreshPromise = refreshAccessToken().finally(() => {
        refreshPromise = null;
      });
    }
    try {
      token = await refreshPromise;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      return null;
    }
  }
  
  return token;
}

function startAutoRefresh(callback?: (success: boolean, message?: string) => void, intervalMinutes: number = 50) {
  console.log('🔄 Iniciando auto-refresh de token cada 50 minutos');
  
  const intervalId = setInterval(async () => {
    if (document.visibilityState === 'visible') {
      try {
        const newToken = await refreshAccessToken();
        console.log('✅ Token de Drive renovado automáticamente');
        if (callback) callback(true, 'Conexión con Drive renovada automáticamente');
        
        const event = new CustomEvent('drive-token-refreshed', {
          detail: { success: true, message: 'Conexión con Drive renovada' }
        });
        window.dispatchEvent(event);
      } catch (error) {
        console.error('Auto-refresh falló:', error);
        if (callback) callback(false, 'Conexión con Drive expirada, reconecta manualmente');
        
        const event = new CustomEvent('drive-token-refreshed', {
          detail: { success: false, message: 'Conexión con Drive expirada' }
        });
        window.dispatchEvent(event);
      }
    }
  }, intervalMinutes * 60 * 1000);
  
  return intervalId;
}

// ======================== COMPONENTE PRINCIPAL ========================
const CATEGORIAS_CONFIG: any = {
  "Útiles Escolares": "Activo",
  "Material Didáctico": "Activo",
  "Oficina / Administrativo": "Activo",
  "Limpieza e Higiene": "Activo",
  "Tecnología y Accesorios": "Activo",
  "Uniformes": "Activo",
  "Mobiliario": "Activo",
  "Materiales de Construcción": "Activo",
  "Herramientas": "Activo",
  "Cafetería": "Activo",
  "Servicios Básicos": "Pasivo",
  "Mantenimiento": "Pasivo"
};

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Panel');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [historyFiles, setHistoryFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showUbicacionModal, setShowUbicacionModal] = useState(false);
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [mounted, setMounted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(new Date());
  const [ubicacionEditando, setUbicacionEditando] = useState<any>(null);
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [nuevoResponsableInput, setNuevoResponsableInput] = useState(false);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveChecking, setDriveChecking] = useState(true);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const addToast = (message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({ isOpen: true, title, message, onConfirm });
  };

  const [printConfig, setPrintConfig] = useState({
    remitente_nombre: 'ING. HERALDO ALCIVAR VELASCO',
    remitente_cargo: 'DPTO. MANTENIMIENTO E INVENTARIO',
    inspector_nombre: 'ECON. GABRIEL ORDOÑEZ',
    inspector_cargo: 'INSPECTOR GENERAL',
    incluir_inspector: true,
    testigo_nombre: '',
    testigo_cargo: '',
    acta_no: `DMI-${new Date().getFullYear()}-${Math.floor(Math.random() * 9000) + 1000}`,
    fecha: new Date().toLocaleDateString('es-EC'),
    responsable_filtro: '',
    cargo_encargado: '',
  });

  const [formData, setFormData] = useState({
    id: null, nombre: '', categoria: 'Útiles Escolares', stock: 1,
    imagen_url: '', codigo: '', estado: 'Bueno',
    fecha_adquisicion: new Date().toISOString().split('T')[0],
    ubicacion: '', tipo_contable: 'Activo',
    responsable_nombre: '', observaciones: ''
  });

  const [userFormData, setUserFormData] = useState({
    id: '', full_name: '', email: '', cedula: '', role: 'user', password: ''
  });

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
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (error || !profile) {
        console.error('Error obteniendo perfil:', error);
        return router.push('/login');
      }
      
      if (profile.role !== 'admin') {
        if (profile.role === 'espectador') router.push('/');
        else if (profile.role === 'encargado') router.push('/Encargado');
        else router.push('/login');
        return;
      }
      
      setAdminProfile(profile);
      fetchAdminData();
      
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('drive') === 'connected') {
        addToast('✅ Google Drive conectado correctamente', 'success');
        window.history.replaceState({}, '', '/admin/dashboard');
      }
      if (urlParams.get('error')) {
        addToast('❌ Error al conectar Google Drive', 'error');
        window.history.replaceState({}, '', '/admin/dashboard');
      }
      
      await checkDriveConnection();
    };
    checkAuth();
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (adminProfile && driveConnected) {
      const handleTokenRefresh = (event: CustomEvent) => {
        if (event.detail.success) {
          addToast('🔁 ' + event.detail.message, 'success');
        } else if (event.detail.message) {
          addToast('⚠️ ' + event.detail.message, 'warning');
          setDriveConnected(false);
        }
      };
      
      const intervalId = startAutoRefresh((success, message) => {
        if (!success && message) {
          addToast('⚠️ ' + message, 'warning');
          setDriveConnected(false);
        } else if (success) {
          setDriveConnected(true);
        }
      }, 50);
      
      window.addEventListener('drive-token-refreshed', handleTokenRefresh as EventListener);
      
      return () => {
        clearInterval(intervalId);
        window.removeEventListener('drive-token-refreshed', handleTokenRefresh as EventListener);
      };
    }
  }, [adminProfile, driveConnected]);

  useEffect(() => {
    const checkLocalToken = async () => {
      const token = localStorage.getItem('drive_access_token');
      if (token) {
        try {
          const res = await fetch('/api/auth/drive/refresh', { method: 'POST' });
          if (res.ok) {
            const data = await res.json();
            if (data.success) {
              setDriveConnected(true);
              localStorage.setItem('drive_access_token', data.access_token);
              localStorage.setItem('drive_token_expiry', (Date.now() + 55 * 60 * 1000).toString());
            }
          }
        } catch (error) {
          console.log('Token local inválido, se necesita reconectar');
          localStorage.removeItem('drive_access_token');
          localStorage.removeItem('drive_token_expiry');
          setDriveConnected(false);
        }
      }
      setDriveChecking(false);
    };
    checkLocalToken();
  }, []);

  async function fetchAdminData() {
    setLoading(true);
    const { data: itemsData } = await supabase.from('items').select('*').order('created_at', { ascending: false });
    const { data: userData } = await supabase.from('profiles').select('*').order('full_name');
    const { data: ubiData } = await supabase.from('ubicaciones').select('*').order('nombre');
    
    setItems(itemsData || []);
    setUsuarios(userData || []);
    setUbicaciones(ubiData || []);
    setLoading(false);
  }

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/drive/history');
      if (res.ok) {
        const data = await res.json();
        setHistoryFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error cargando historial:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const getProxyImageUrl = (originalUrl: string) => {
    if (!originalUrl) return '';
    if (originalUrl.includes('drive.google.com')) {
      const fileIdMatch = originalUrl.match(/[-\w]{25,}/);
      if (fileIdMatch) return `/api/image-proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    return originalUrl;
  };

  // ======================== NUEVA FUNCIÓN GENERAR PDF BLOB ========================
  const generatePdfBlob = async (htmlContent: string): Promise<Blob> => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.top = '-9999px';
    iframe.style.left = '-9999px';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('No se pudo acceder al iframe');

    iframeDoc.open();
    iframeDoc.write(htmlContent);
    iframeDoc.close();

    await new Promise(resolve => setTimeout(resolve, 1500));

    const html2canvas = (await import('html2canvas')).default;
    const jsPDF = (await import('jspdf')).default;

    const canvas = await html2canvas(iframeDoc.body, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      windowWidth: iframeDoc.body.scrollWidth,
      windowHeight: iframeDoc.body.scrollHeight,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const imgWidth = 190;
    const pageHeight = 277;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 10, position, imgWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pageHeight;
    }

    document.body.removeChild(iframe);
    return pdf.output('blob');
  };

  // ======================== NUEVA VERSIÓN DE savePdfToDrive (recibe blob) ========================
  const savePdfToDrive = async (pdfBlob: Blob, fileName: string) => {
    if (uploadingPdf) return;
    setUploadingPdf(true);
    try {
      let token = await getValidAccessToken();
      if (!token) {
        addToast('Conecta Google Drive primero', 'warning');
        connectToDrive();
        return;
      }
      const formData = new FormData();
      formData.append('file', pdfBlob, `${fileName}.pdf`);
      formData.append('fileName', `${fileName}.pdf`);
      token = await getValidAccessToken();
      const res = await fetch('/api/upload/pdf', {
        method: 'POST',
        body: formData,
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401) {
        addToast('Token expirado, reconecta Google Drive', 'warning');
        setDriveConnected(false);
        connectToDrive();
        return;
      }
      if (!res.ok) throw new Error('Error al subir el PDF');
      addToast('PDF guardado en Drive correctamente', 'success');
      if (activeTab === 'Historial') fetchHistory();
    } catch (error) {
      console.error(error);
      addToast('No se pudo guardar el PDF en Drive', 'error');
    } finally {
      setUploadingPdf(false);
    }
  };

  const responsablesExistentes = [...new Set(items.map(i => i.responsable_nombre).filter(Boolean))];
  const responsablesUnicos = [...new Set(items.map(i => i.responsable_nombre).filter(Boolean))];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // ======================== REPORTE GENERAL DE INVENTARIO (ACTUALIZADO) ========================
  const handlePrintInventory = async () => {
  const activos = items.filter(i => i.tipo_contable === 'Activo');
  const pasivos = items.filter(i => i.tipo_contable === 'Pasivo');
  const patrimonio = items.filter(i => i.tipo_contable === 'Patrimonio');

  const renderTableRows = (itemsList: any[]) => itemsList.map(i => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${i.codigo || '---'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">
        <strong style="font-size: 14px; color: #1a202c;">${i.nombre || 'Sin nombre'}</strong><br>
        <span style="font-size: 11px; color: #718096;">${i.categoria || '---'}</span>
        ${i.observaciones ? `<br><span style="font-size: 10px; color: #a0aec0;">${i.observaciones}</span>` : ''}
      </td>
      <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">${i.stock || 0}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${i.responsable_nombre || 'Sin asignar'}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid #e2e8f0;">${i.ubicacion || 'Sin ubicación'}</td>
    </tr>
  `).join('');

  const totalItems = items.length;
  const totalActivos = activos.length;
  const totalPasivos = pasivos.length;
  const totalPatrimonio = patrimonio.length;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>INV-CORE | Reporte General de Inventario</title>
        <meta charset="utf-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
            background: #f4f7fc;
            padding: 30px 20px;
            font-size: 13px;
            color: #1e293b;
          }
          .report-container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #2D1B69 0%, #3d2a8a 100%);
            color: white;
            padding: 30px 35px;
            text-align: center;
          }
          .logo {
            font-size: 32px;
            font-weight: 800;
            letter-spacing: -0.5px;
            margin-bottom: 6px;
          }
          .logo span { color: #FFD700; }
          .subtitle { font-size: 12px; opacity: 0.8; letter-spacing: 1px; }
          .fecha {
            text-align: right;
            font-size: 11px;
            color: #94a3b8;
            padding: 15px 30px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
          }
          .stats {
            display: flex;
            justify-content: space-around;
            padding: 20px 30px;
            background: #f1f5f9;
            gap: 15px;
            flex-wrap: wrap;
          }
          .stat-card {
            background: white;
            border-radius: 16px;
            padding: 12px 24px;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0,0,0,0.05);
            flex: 1;
            min-width: 100px;
          }
          .stat-number { font-size: 28px; font-weight: 800; color: #1e293b; }
          .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #475569;
            margin-top: 4px;
          }
          h2 {
            font-size: 18px;
            margin: 25px 30px 15px 30px;
            padding-left: 12px;
            border-left: 5px solid #FFD700;
            color: #0f172a;
            font-weight: 700;
          }
          .table-wrapper {
            overflow-x: auto;
            margin: 0 25px 30px 25px;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            background: white;
          }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th {
            background: #f1f5f9;
            padding: 12px 8px;
            text-align: left;
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            color: #334155;
            border-bottom: 1px solid #cbd5e1;
          }
          td { vertical-align: top; }
          .footer {
            text-align: center;
            padding: 20px 30px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #64748b;
          }
          /* Sin @media print: la impresión usará los mismos estilos */
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header">
            <div class="logo">INV<span>-CORE</span></div>
            <div class="subtitle">Sistema de Gestión de Inventarios</div>
          </div>
          <div class="fecha">Generado: ${now.toLocaleString('es-EC')}</div>
          <div class="stats">
            <div class="stat-card"><div class="stat-number">${totalActivos}</div><div class="stat-label">Activos</div></div>
            <div class="stat-card"><div class="stat-number">${totalPasivos}</div><div class="stat-label">Pasivos</div></div>
            <div class="stat-card"><div class="stat-number">${totalPatrimonio}</div><div class="stat-label">Patrimonio</div></div>
            <div class="stat-card"><div class="stat-number">${totalItems}</div><div class="stat-label">Total Ítems</div></div>
          </div>
          <h2>📦 ACTIVOS</h2>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th style="text-align:center;">STOCK</th><th>RESPONSABLE</th><th>UBICACIÓN</th></tr></thead>
              <tbody>${renderTableRows(activos)}</tbody>
            </table>
          </div>
          <h2>📋 PASIVOS</h2>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th style="text-align:center;">STOCK</th><th>RESPONSABLE</th><th>UBICACIÓN</th></tr></thead>
              <tbody>${renderTableRows(pasivos)}</tbody>
            </table>
          </div>
          <h2>🏛️ PATRIMONIO</h2>
          <div class="table-wrapper">
            <table>
              <thead><tr><th>CÓDIGO</th><th>DESCRIPCIÓN</th><th style="text-align:center;">STOCK</th><th>RESPONSABLE</th><th>UBICACIÓN</th></tr></thead>
              <tbody>${renderTableRows(patrimonio)}</tbody>
            </table>
          </div>
          <div class="footer">Documento generado automáticamente por INV-CORE • Todos los derechos reservados</div>
        </div>
      </body>
    </html>
  `;

  try {
    setUploadingPdf(true);
    // 1) Generar PDF y guardarlo en Drive
    const pdfBlob = await generatePdfBlob(htmlContent);
    const fileName = `Reporte_General_${now.toISOString().slice(0, 10)}_${now.toTimeString().slice(0, 5).replace(':', '-')}`;
    await savePdfToDrive(pdfBlob, fileName).catch(err => console.warn('Error guardando en Drive:', err));

    // 2) Imprimir DIRECTAMENTE desde un iframe oculto (sin abrir nueva pestaña)
    const iframePrint = document.createElement('iframe');
    iframePrint.style.position = 'absolute';
    iframePrint.style.top = '-9999px';
    iframePrint.style.left = '-9999px';
    iframePrint.style.width = '0';
    iframePrint.style.height = '0';
    document.body.appendChild(iframePrint);

    const iframeDoc = iframePrint.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      iframePrint.onload = () => {
        iframePrint.contentWindow?.focus();
        iframePrint.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframePrint)) document.body.removeChild(iframePrint);
        }, 1000);
      };
    } else {
      addToast('Error al preparar la impresión del reporte', 'error');
    }
  } catch (error) {
    console.error(error);
    addToast('Error al generar el Reporte General', 'error');
  } finally {
    setUploadingPdf(false);
  }
};

  // ======================== ACTA DE ENTREGA CORREGIDA ========================
  const handlePrintActa = async () => {
  if (!printConfig.responsable_filtro) {
    addToast('Selecciona un responsable en el filtro', 'warning');
    return;
  }

  const itemsFiltrados = items.filter(i => i.responsable_nombre === printConfig.responsable_filtro);
  if (itemsFiltrados.length === 0) {
    addToast(`No hay items asignados a "${printConfig.responsable_filtro}"`, 'error');
    return;
  }

  const fechaActa = printConfig.fecha || new Date().toLocaleDateString('es-EC');

  // Render de filas (igual que antes)
  const renderTableRows = itemsFiltrados.map(i => `
    <tr>
      <td style="border: 1px solid #000; padding: 8px 6px; text-align: center; vertical-align: middle;">
        ${i.imagen_url ? 
          `<img src="${getProxyImageUrl(i.imagen_url)}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 6px; display: block; margin: 0 auto;" />` : 
          `<div style="width: 60px; height: 60px; background: #f0f0f0; border-radius: 6px; margin: 0 auto;"></div>`
        }
      </td>
      <td style="border: 1px solid #000; padding: 8px 6px; text-align: center; vertical-align: middle; font-weight: bold; font-size: 13px;">${i.stock || 1}</td>
      <td style="border: 1px solid #000; padding: 8px 6px; vertical-align: top;">
        <strong style="font-size: 13px;">${i.nombre || 'Sin nombre'}</strong><br>
        ${i.codigo ? `<span style="font-size: 11px; color: #555;">Código: ${i.codigo}</span><br>` : ''}
        ${i.categoria ? `<span style="font-size: 11px; color: #555;">Categoría: ${i.categoria}</span>` : ''}
      </td>
      <td style="border: 1px solid #000; padding: 8px 6px; text-align: center; vertical-align: middle; font-size: 12px;">${i.estado || 'Bueno'}</td>
      <td style="border: 1px solid #000; padding: 8px 6px; vertical-align: top; font-size: 11px;">${i.observaciones || 'Sin observaciones'}</td>
      <td style="border: 1px solid #000; padding: 8px 6px; text-align: center; vertical-align: middle; font-size: 11px;">${i.fecha_adquisicion ? new Date(i.fecha_adquisicion).toLocaleDateString('es-EC') : 'No registrada'}</td>
    </tr>
  `).join('');

  const totalItems = itemsFiltrados.length;
  const totalCantidad = itemsFiltrados.reduce((sum, i) => sum + (i.stock || 1), 0);

  // CSS SIN @media print PARA QUE LA IMPRESIÓN SEA IDÉNTICA A LA PANTALLA
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>ACTA DE ENTREGA - ${printConfig.responsable_filtro}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', 'Segoe UI', 'Roboto', 'Helvetica Neue', sans-serif;
      background: white;
      padding: 0;
      margin: 0;
      font-size: 13px;
      line-height: 1.45;
      color: #1e2a3e;
    }
    .page {
      max-width: 1100px;
      margin: 0 auto;
      background: white;
      padding: 15px 20px 25px 20px;
      box-sizing: border-box;
    }
    .header-image { text-align: center; margin: 0 0 12px 0; }
    .header-image img { width: 100%; height: auto; display: block; }
    .title {
      text-align: center;
      font-size: 22px;
      font-weight: 700;
      text-transform: uppercase;
      margin: 12px 0 8px 0;
      color: #8039a3;
      letter-spacing: -0.3px;
    }
    .acta-code {
      text-align: center;
      font-size: 14px;
      margin-bottom: 20px;
      font-weight: 600;
      color: #2c3e50;
    }
    .meta-data {
      margin: 16px 0;
      padding: 14px 20px;
      background: #f8f9fc;
      border-left: 5px solid #8039a3;
      font-size: 12.5px;
      border-radius: 4px;
    }
    .meta-data p { margin: 6px 0; }
    .meta-data strong { color: #8039a3; font-weight: 600; }
    .description {
      margin: 16px 0;
      text-align: justify;
      font-size: 13px;
      line-height: 1.5;
    }
    .table-wrapper {
      margin: 18px 0;
      border: 1px solid #d0d7de;
      border-radius: 8px;
      overflow-x: auto;
      background: white;
    }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th {
      background: #8039a3;
      color: white;
      padding: 12px 8px;
      text-align: center;
      border: 1px solid #6a2e8a;
      font-weight: 700;
      font-size: 12.5px;
    }
    td {
      border: 1px solid #e2e8f0;
      padding: 10px 8px;
      vertical-align: top;
      background-color: white;
    }
    .total-bienes {
      text-align: right;
      margin: 12px 0;
      font-size: 13px;
      font-weight: 700;
      color: #1e4666;
    }
    .nota {
      margin: 18px 0;
      padding: 12px 18px;
      background: #fffbeb;
      border-left: 5px solid #f5b042;
      border-radius: 6px;
      font-size: 11.5px;
      color: #92400e;
    }
    .signatures {
      margin-top: 50px;
      display: flex;
      justify-content: space-between;
      text-align: center;
      gap: 30px;
      flex-wrap: wrap;
    }
    .signature {
      flex: 1;
      min-width: 170px;
    }
    .signature-line {
      border-top: 1.5px solid #334155;
      margin-top: 45px;
      margin-bottom: 10px;
      width: 100%;
    }
    .signature-name { font-weight: 700; font-size: 13px; color: #1e293b; }
    .signature-title { font-size: 11px; color: #4b5563; margin-top: 4px; }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 9px;
      color: #8ca3b9;
      border-top: 1px solid #eef2f6;
      padding-top: 12px;
    }
    /* Sin @media print: la impresión usará los mismos estilos que la pantalla */
  </style>
</head>
<body>
<div class="page">
  <div class="header-image">
    <img src="/cabecera.png" alt="Logo Institución" onerror="this.style.display='none'">
  </div>
  <div class="title">ACTA DE ENTREGA DE BIENES</div>
  <div class="acta-code">Código: ${printConfig.acta_no} | Fecha: ${fechaActa}</div>
  <div class="meta-data">
    <p><strong>DE:</strong> ${printConfig.remitente_nombre} - ${printConfig.remitente_cargo}</p>
    ${printConfig.incluir_inspector ? `<p><strong>INSPECTOR:</strong> ${printConfig.inspector_nombre} - ${printConfig.inspector_cargo}</p>` : ''}
    <p><strong>PARA (RESPONSABLE):</strong> ${printConfig.responsable_filtro} - ${printConfig.cargo_encargado || 'RESPONSABLE'}</p>
    ${printConfig.testigo_nombre ? `<p><strong>TESTIGO:</strong> ${printConfig.testigo_nombre}${printConfig.testigo_cargo ? ` - ${printConfig.testigo_cargo}` : ''}</p>` : ''}
    <p><strong>FECHA DE ENTREGA:</strong> ${fechaActa}</p>
  </div>
  <div class="description">
    Por medio del presente se realiza formalmente y de manera detallada la entrega de los siguientes bienes, 
    bajo la responsabilidad del encargado firmante. Este documento lo compromete como único responsable 
    de los bienes que se le están entregando a su cargo.
  </div>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr>
          <th style="width:12%">IMAGEN</th>
          <th style="width:6%">CANT.</th>
          <th style="width:32%">DESCRIPCIÓN</th>
          <th style="width:10%">ESTADO</th>
          <th style="width:25%">OBSERVACIONES</th>
          <th style="width:15%">FECHA ADQ.</th>
        </tr>
      </thead>
      <tbody>
        ${renderTableRows}
      </tbody>
    </table>
  </div>
  <div class="total-bienes">
    Total de bienes entregados: ${totalItems} tipos | Cantidad total de unidades: ${totalCantidad}
  </div>
  <div class="nota">
    <strong>📌 Recordatorio:</strong> En caso de encontrarse novedades al final del periodo, se le recuerda 
    que usted es el único responsable de entregar los bienes en las mismas condiciones en que fueron recibidos.
  </div>
  <div class="signatures">
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-name">${printConfig.remitente_nombre}</div>
      <div class="signature-title">${printConfig.remitente_cargo}</div>
    </div>
    ${printConfig.incluir_inspector ? `
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-name">${printConfig.inspector_nombre}</div>
      <div class="signature-title">${printConfig.inspector_cargo}</div>
    </div>` : ''}
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-name">${printConfig.responsable_filtro}</div>
      <div class="signature-title">${printConfig.cargo_encargado || 'RESPONSABLE'}</div>
    </div>
    ${printConfig.testigo_nombre ? `
    <div class="signature">
      <div class="signature-line"></div>
      <div class="signature-name">${printConfig.testigo_nombre}</div>
      <div class="signature-title">${printConfig.testigo_cargo || 'TESTIGO'}</div>
    </div>` : ''}
  </div>
  <div class="footer">
    Documento generado automáticamente por INV-CORE - Sistema de Gestión de Inventarios
  </div>
</div>
</body>
</html>`;

  try {
    setUploadingPdf(true);

    // 1) Generar PDF y guardarlo en Drive (opcional)
    const pdfBlob = await generatePdfBlob(htmlContent);
    const fileName = `Acta_Entrega_${printConfig.responsable_filtro.replace(/\s/g, '_')}_${printConfig.acta_no}`;
    await savePdfToDrive(pdfBlob, fileName).catch(err => console.warn('Error guardando en Drive:', err));

    // 2) Imprimir DIRECTAMENTE desde un iframe oculto (SIN abrir nueva pestaña)
    const iframePrint = document.createElement('iframe');
    iframePrint.style.position = 'absolute';
    iframePrint.style.top = '-9999px';
    iframePrint.style.left = '-9999px';
    iframePrint.style.width = '0';
    iframePrint.style.height = '0';
    document.body.appendChild(iframePrint);

    const iframeDoc = iframePrint.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      iframePrint.onload = () => {
        iframePrint.contentWindow?.focus();
        iframePrint.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframePrint)) document.body.removeChild(iframePrint);
        }, 1000);
      };
    } else {
      addToast('Error al preparar la impresión', 'error');
    }
  } catch (error) {
    console.error('Error generando el Acta:', error);
    addToast('Error al generar el Acta de Entrega', 'error');
  } finally {
    setUploadingPdf(false);
  }
};

  // ======================== GRÁFICOS Y OTRAS FUNCIONES (sin cambios) ========================
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

  const handleDeleteItem = async (itemId: string, itemName: string) => {
    showConfirm('Eliminar artículo', `¿Estás seguro de eliminar "${itemName}"? Esta acción no se puede deshacer.`, async () => {
      const { error } = await supabase.from('items').delete().eq('id', itemId);
      if (!error) {
        addToast('Artículo eliminado correctamente', 'success');
        fetchAdminData();
      } else {
        addToast('Error al eliminar el artículo', 'error');
      }
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    showConfirm('Eliminar usuario', `¿Eliminar permanentemente al usuario ${userEmail || 'este usuario'}?`, async () => {
      const { error } = await supabase.from('profiles').delete().eq('id', userId);
      if (!error) {
        addToast('Usuario eliminado correctamente', 'success');
        fetchAdminData();
      } else {
        addToast('Error al eliminar usuario', 'error');
      }
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleDeleteUbicacionWithConfirm = (id: string, nombre: string) => {
    showConfirm('Eliminar ubicación', `¿Eliminar "${nombre}"? Los ítems quedarán sin sede asignada.`, async () => {
      const { error } = await supabase.from('ubicaciones').delete().eq('id', id);
      if (!error) {
        addToast('Ubicación eliminada', 'success');
        fetchAdminData();
      } else {
        addToast('Error al eliminar ubicación', 'error');
      }
      setConfirmModal(prev => ({ ...prev, isOpen: false }));
    });
  };

  const handleSaveItemWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ubicacion || !formData.responsable_nombre) {
      addToast('Completa la ubicación y el nombre del responsable.', 'warning');
      return;
    }
    
    let codigoFinal = formData.codigo;
    if (!codigoFinal) {
      const prefijo = formData.tipo_contable === 'Activo' ? 'ACT' : 'PAS';
      codigoFinal = `${prefijo}-${Date.now().toString().slice(-6)}`;
    }
    
    const { id, ...payload } = { ...formData, codigo: codigoFinal };
    const { error } = id
      ? await supabase.from('items').update(payload).eq('id', id)
      : await supabase.from('items').insert([payload]);

    if (!error) {
      setShowModal(false);
      fetchAdminData();
      setFormData({
        id: null, nombre: '', categoria: 'Útiles Escolares', stock: 1,
        imagen_url: '', codigo: '', estado: 'Bueno',
        fecha_adquisicion: new Date().toISOString().split('T')[0],
        ubicacion: '', tipo_contable: 'Activo',
        responsable_nombre: '', observaciones: ''
      });
      setNuevoResponsableInput(false);
      addToast(id ? 'Artículo actualizado' : 'Artículo registrado', 'success');
    } else {
      addToast(error.message, 'error');
    }
  };

  const handleSaveUserWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    const { password, ...profileData } = userFormData;
    const { error: profileError } = await supabase.from('profiles').update(profileData).eq('id', profileData.id);
    if (password && password.length >= 6) {
      addToast('La actualización de contraseña requiere permisos administrativos de Auth.', 'info');
    }
    if (!profileError) {
      setShowUserModal(false);
      fetchAdminData();
      addToast('Perfil actualizado', 'success');
    } else {
      addToast(profileError.message, 'error');
    }
  };

  const handleSaveUbicacionWrapper = async () => {
    if (!ubicacionEditando?.nombre?.trim()) {
      addToast('El nombre no puede estar vacío', 'warning');
      return;
    }
    const { error } = await supabase
      .from('ubicaciones')
      .update({ nombre: ubicacionEditando.nombre.toUpperCase() })
      .eq('id', ubicacionEditando.id);
    
    if (!error) {
      setShowUbicacionModal(false);
      setUbicacionEditando(null);
      fetchAdminData();
      addToast('Ubicación actualizada', 'success');
    } else {
      addToast('Error: ' + error.message, 'error');
    }
  };

  const handleAddUbicacionWrapper = async () => {
    if (!nuevaUbicacion.trim()) {
      addToast('Ingresa el nombre de la ubicación', 'warning');
      return;
    }
    const { error } = await supabase
      .from('ubicaciones')
      .insert([{ nombre: nuevaUbicacion.trim().toUpperCase() }]);
    
    if (!error) {
      setNuevaUbicacion('');
      fetchAdminData();
      addToast('Ubicación registrada', 'success');
    } else {
      addToast('Error: ' + error.message, 'error');
    }
  };

  const handleImageUploadWrapper = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      let token = await getValidAccessToken();
      if (!token) {
        addToast('Conecta Google Drive primero', 'warning');
        connectToDrive();
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      if (adminProfile?.id) formData.append('userId', adminProfile.id);

      token = await getValidAccessToken();
      const res = await fetch('/api/upload', { 
        method: 'POST', 
        body: formData,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.status === 401) {
        addToast('Token expirado, reconecta Google Drive', 'warning');
        setDriveConnected(false);
        connectToDrive();
        return;
      }
      if (!res.ok) throw new Error('Error al subir imagen');

      const data = await res.json();
      setFormData(prev => ({ ...prev, imagen_url: data.url }));
      addToast('Imagen subida a Google Drive correctamente', 'success');
      setDriveConnected(true);
    } catch (err) {
      console.error(err);
      addToast('Error al subir imagen. Intenta vincular desde Drive manualmente.', 'error');
    } finally {
      setUploadingImage(false);
    }
  };

  const checkDriveConnection = async () => {
    setDriveChecking(true);
    try {
      const res = await fetch('/api/upload/check', { method: 'GET' });
      const data = await res.json();
      const connected = data.connected || false;
      setDriveConnected(connected);
      
      if (connected) {
        try {
          const token = await getValidAccessToken();
          if (token) {
            console.log('✅ Token de Drive inicializado');
            setDriveConnected(true);
          } else {
            console.log('⚠️ Conectado pero sin token válido');
            setDriveConnected(false);
          }
        } catch (tokenError) {
          console.error('Error obteniendo token:', tokenError);
          setDriveConnected(false);
        }
      }
    } catch (error) {
      console.error('Error checking drive connection:', error);
      setDriveConnected(false);
    } finally {
      setDriveChecking(false);
    }
  };

  const connectToDrive = () => {
    if (adminProfile?.id) window.location.href = `/api/auth/drive?userId=${adminProfile.id}`;
    else window.location.href = '/api/auth/drive';
  };

  const handleDriveLink = () => {
    const rawUrl = prompt("Pega el enlace de compartir de Google Drive (debe ser público):");
    if (!rawUrl) return;
    try {
      const fileIdMatch = rawUrl.match(/[-\w]{25,}/);
      if (fileIdMatch) {
        const directUrl = `https://drive.google.com/uc?export=view&id=${fileIdMatch[0]}`;
        setFormData({ ...formData, imagen_url: directUrl });
        addToast('Enlace de Drive vinculado', 'success');
      } else {
        addToast('Enlace no válido', 'error');
      }
    } catch (e) {
      addToast('Error al procesar el enlace', 'error');
    }
  };

  // ======================== RENDER (JSX) ========================
  if (!mounted) return null;

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900">
        <ToastContainer />
        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
        />
        
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
              { id: 'Impresiones', icon: <Printer size={18} />, label: 'Impresiones' },
              { id: 'Ubicaciones', icon: <MapPin size={18} />, label: 'Ubicaciones' },
              { id: 'Usuarios', icon: <Users size={18} />, label: 'Usuarios' },
              { id: 'Historial', icon: <Clock size={18} />, label: 'Historial' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { 
                  setActiveTab(tab.id); 
                  setIsMobileMenuOpen(false);
                  if (tab.id === 'Historial') fetchHistory();
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Panel Administrativo</p>
                <h2 className="text-[#2D1B69] font-black">{adminProfile?.full_name || 'Admin'}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={connectToDrive} disabled={driveChecking} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${driveChecking ? 'bg-gray-400 text-white cursor-wait' : driveConnected ? 'bg-green-100 text-green-700 border border-green-300' : 'bg-red-500 text-white hover:bg-red-600'}`}>
                  {driveChecking ? <Loader2 size={14} className="animate-spin" /> : driveConnected ? <><CheckCircle size={14} /> Activo</> : <><Upload size={14} /> Conectar Google Drive</>}
                </button>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">{now.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'short' })}</p>
                  <p className="font-mono font-bold text-[#B08A00]">{now.toLocaleTimeString()}</p>
                </div>
              </div>
            </header>

            {/* PANEL */}
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
                    <div><p className="text-[9px] font-black uppercase opacity-60">Usuarios</p><h3 className="text-4xl font-black">{usuarios.length}</h3></div>
                    <div className="opacity-20 scale-[2]"><Users /></div>
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

            {/* INVENTARIO */}
              {activeTab === 'Inventario' && (
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                  <div className="p-6 flex flex-wrap gap-4 justify-between bg-slate-50/50">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-4 top-3.5 text-slate-400" size={18} />
                      <input type="text" placeholder="Buscar por nombre, código, responsable, ubicación o fecha..." className="w-full pl-12 pr-4 py-3.5 border-none bg-white rounded-xl text-sm shadow-sm" onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button 
                        onClick={handlePrintInventory} 
                        disabled={uploadingPdf} 
                        className="bg-slate-200 text-slate-700 px-5 py-3.5 rounded-xl text-xs font-bold uppercase flex items-center gap-2"
                      >
                        {uploadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />}
                        {uploadingPdf ? 'Generando Reporte...' : 'Reporte General'}
                      </button>
                      <button onClick={() => { setFormData({ ...formData, id: null, nombre: '', codigo: '', imagen_url: '', observaciones: '' }); setShowModal(true); }} className="bg-[#2D1B69] text-white px-6 py-3.5 rounded-xl text-xs font-bold uppercase flex items-center gap-2">
                        <Plus size={16} /> Nuevo Artículo
                      </button>
                    </div>
                  </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-5 text-center">Imagen</th><th className="p-5">Código</th><th className="p-5">Artículo</th><th className="p-5">Responsable</th><th className="p-5">Ubicación</th><th className="p-5 text-center">Stock</th><th className="p-5">Fecha Adq.</th><th className="p-5 text-right">Acciones</th></tr></thead>
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
                          <td className="p-5 text-right"><div className="flex justify-end gap-1"><button onClick={() => { setFormData(item); setShowModal(true); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg"><Edit3 size={16} /></button><button onClick={() => handleDeleteItem(item.id, item.nombre)} className="text-red-500 p-2 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* IMPRESIONES - Formulario mejorado */}
            {activeTab === 'Impresiones' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8">
                <h3 className="text-[#2D1B69] font-black uppercase italic mb-6 flex items-center gap-2"><Printer size={24} /> Generar Acta de Entrega Personalizada</h3>
                <div className="bg-slate-50 rounded-2xl p-6 mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2 bg-[#2D1B69]/10 p-2 rounded">📤 REMITENTE (Quien entrega)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <input className="border border-indigo-200 rounded-xl p-3 text-sm bg-white" placeholder="Nombre del remitente" value={printConfig.remitente_nombre} onChange={(e) => setPrintConfig({...printConfig, remitente_nombre: e.target.value})} />
                        <input className="border border-indigo-200 rounded-xl p-3 text-sm bg-white" placeholder="Cargo del remitente" value={printConfig.remitente_cargo} onChange={(e) => setPrintConfig({...printConfig, remitente_cargo: e.target.value})} />
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-black uppercase text-slate-500 block">👔 INSPECTOR GENERAL (Opcional)</label>
                        <button onClick={() => setPrintConfig({...printConfig, incluir_inspector: !printConfig.incluir_inspector})} className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1">
                          {printConfig.incluir_inspector ? <Trash size={14} /> : <span className="text-green-500">+ Agregar</span>}
                          {printConfig.incluir_inspector ? ' Eliminar Inspector' : ' Agregar Inspector'}
                        </button>
                      </div>
                      {printConfig.incluir_inspector && (
                        <div className="grid grid-cols-2 gap-3">
                          <input className="border border-indigo-200 rounded-xl p-3 text-sm bg-white" placeholder="Nombre del Inspector" value={printConfig.inspector_nombre} onChange={(e) => setPrintConfig({...printConfig, inspector_nombre: e.target.value})} />
                          <input className="border border-indigo-200 rounded-xl p-3 text-sm bg-white" placeholder="Cargo del Inspector" value={printConfig.inspector_cargo} onChange={(e) => setPrintConfig({...printConfig, inspector_cargo: e.target.value})} />
                        </div>
                      )}
                    </div>

                    <div className="md:col-span-2">
                      <label className="text-[10px] font-black uppercase text-slate-500 block mb-2">👤 RESPONSABLE DE LOS ÍTEMS (Quien recibe)</label>
                      <div className="grid grid-cols-2 gap-3">
                        <select className="border border-indigo-200 rounded-xl p-3 text-sm bg-white" value={printConfig.responsable_filtro} onChange={(e) => setPrintConfig({...printConfig, responsable_filtro: e.target.value})}>
                          <option value="">Seleccionar un responsable...</option>
                          {responsablesUnicos.map(resp => <option key={resp} value={resp}>{resp}</option>)}
                        </select>
                        <input className="border border-indigo-200 rounded-xl p-3 text-sm bg-white" placeholder="Cargo del responsable" value={printConfig.cargo_encargado} onChange={(e) => setPrintConfig({...printConfig, cargo_encargado: e.target.value})} />
                      </div>
                    </div>

                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">🕊️ Testigo (Opcional)</label><input className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" placeholder="Nombre del testigo" value={printConfig.testigo_nombre} onChange={e => setPrintConfig({...printConfig, testigo_nombre: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">📋 Cargo del Testigo</label><input className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" placeholder="Ej: TUTOR/A DE AULA" value={printConfig.testigo_cargo} onChange={e => setPrintConfig({...printConfig, testigo_cargo: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">📄 Número de Acta</label><input className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" value={printConfig.acta_no} onChange={e => setPrintConfig({...printConfig, acta_no: e.target.value})} /></div>
                    <div><label className="text-[10px] font-black uppercase text-slate-500 block mb-2">📅 Fecha del Acta</label><input className="w-full border border-slate-200 rounded-xl p-3 text-sm bg-white" value={printConfig.fecha} onChange={e => setPrintConfig({...printConfig, fecha: e.target.value})} /></div>
                  </div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-2xl mb-6 text-xs text-yellow-800 font-medium flex justify-between items-center">
                  <span>📋 Se imprimirán los items asignados a: <b>{printConfig.responsable_filtro || 'Ninguno seleccionado'}</b></span>
                  <button onClick={() => { if(printConfig.responsable_filtro) { const count = items.filter(i => i.responsable_nombre === printConfig.responsable_filtro).length; addToast(`El responsable "${printConfig.responsable_filtro}" tiene ${count} items asignados`, 'info'); } else { addToast('Selecciona un responsable primero', 'warning'); } }} className="bg-yellow-200 px-4 py-2 rounded-lg text-[10px] font-bold uppercase">Verificar items</button>
                </div>
                <button onClick={handlePrintActa} disabled={uploadingPdf} className="w-full bg-[#2D1B69] text-[#FFD700] py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-opacity-90 transition-all flex items-center justify-center gap-2">
                  {uploadingPdf ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />} 
                  {uploadingPdf ? 'Generando PDF...' : 'Generar Acta de Entrega'}
                </button>
              </div>
            )}

            {/* UBICACIONES */}
            {activeTab === 'Ubicaciones' && (
              <div className="bg-white p-8 md:p-12 rounded-3xl shadow-sm border border-slate-100">
                <h3 className="text-[#2D1B69] font-black uppercase italic mb-6">Gestión de Sedes / Ubicaciones</h3>
                <div className="flex gap-4 mb-10 flex-col sm:flex-row">
                  <input className="flex-1 bg-slate-50 p-5 rounded-2xl text-sm font-bold outline-none focus:ring-4 ring-[#FFD700]/20 transition-all uppercase" placeholder="Nombre de la nueva sede..." value={nuevaUbicacion} onChange={e => setNuevaUbicacion(e.target.value)} />
                  <button onClick={handleAddUbicacionWrapper} className="bg-[#2D1B69] text-[#FFD700] px-10 py-5 rounded-2xl font-black uppercase text-xs shadow-lg">Registrar Sede</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {ubicaciones.map((u: any) => (
                    <div key={u.id} className="p-5 bg-slate-50 rounded-2xl flex justify-between items-center hover:bg-[#2D1B69] hover:text-white transition-all group border border-slate-100">
                      <span className="font-black text-xs tracking-tight">{u.nombre}</span>
                      <div className="flex gap-2">
                        <button onClick={() => { setUbicacionEditando({ id: u.id, nombre: u.nombre }); setShowUbicacionModal(true); }} className="text-blue-500 group-hover:text-white"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteUbicacionWithConfirm(u.id, u.nombre)} className="text-red-400 group-hover:text-white"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* USUARIOS */}
            {activeTab === 'Usuarios' && (
              <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
                <div className="overflow-x-auto">
                  <table className="w-full text-left min-w-[600px]">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase"><tr><th className="p-5">Nombre Completo</th><th className="p-5">Cédula</th><th className="p-5">Correo</th><th className="p-5">Rol</th><th className="p-5 text-right">Acciones</th></tr></thead>
                    <tbody className="text-sm divide-y divide-slate-100">
                      {usuarios.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="p-5 font-bold text-slate-800">{u.full_name || 'Sin nombre'}</td>
                          <td className="p-5 font-mono text-xs font-bold text-slate-600">{u.cedula || '---'}</td>
                          <td className="p-5 text-slate-500 italic">{u.email || 'Sin correo'}</td>
                          <td className="p-5"><span className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black uppercase">{u.role}</span></td>
                          <td className="p-5 text-right"><div className="flex justify-end gap-2"><button onClick={() => { setUserFormData({ ...u, password: '' }); setShowUserModal(true); }} className="text-[#2D1B69] p-3 bg-slate-50 hover:bg-[#FFD700] rounded-xl"><Edit3 size={18} /></button><button onClick={() => handleDeleteUser(u.id, u.email)} className="text-red-500 p-3 bg-slate-50 hover:bg-red-100 rounded-xl"><Trash2 size={18} /></button></div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* HISTORIAL */}
            {activeTab === 'Historial' && (
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 md:p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[#2D1B69] font-black uppercase italic flex items-center gap-2"><Clock size={24} /> Historial de Documentos</h3>
                  <button onClick={fetchHistory} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold uppercase flex items-center gap-2"><RefreshCcw size={14} /> Actualizar</button>
                </div>
                {loadingHistory ? (
                  <div className="text-center py-12"><Loader2 size={32} className="animate-spin mx-auto text-[#2D1B69] mb-4" /><p className="text-slate-500 text-sm">Cargando historial...</p></div>
                ) : historyFiles.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl"><FileText size={48} className="mx-auto text-slate-300 mb-4" /><p className="text-slate-500 font-bold text-sm">No hay documentos en el historial</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] font-bold"><tr><th className="p-4">Documento</th><th className="p-4">Fecha</th><th className="p-4">Tamaño</th><th className="p-4 text-right">Acción</th></tr></thead>
                      <tbody>
                        {historyFiles.map(file => (
                          <tr key={file.id}>
                            <td className="p-4"><div className="flex items-center gap-3"><div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center"><FileText size={14} className="text-red-500" /></div><span className="font-bold text-slate-700 text-xs">{file.name}</span></div></td>
                            <td className="p-4 text-xs text-slate-500">{new Date(file.createdTime).toLocaleDateString('es-EC')}</td>
                            <td className="p-4 text-xs text-slate-500">{file.size}</td>
                            <td className="p-4 text-right"><a href={file.webContentLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 bg-[#2D1B69] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase"><Download size={14} /> Descargar</a></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* MODALES */}
            {showUbicacionModal && ubicacionEditando && (
              <div className="fixed inset-0 bg-[#2D1B69]/60 backdrop-blur-md z-300 flex items-center justify-center p-4">
                <div className="bg-white p-8 md:p-10 rounded-3xl w-full max-w-md shadow-2xl">
                  <div className="flex justify-between items-center mb-6"><h3 className="font-black text-[#2D1B69] uppercase italic">Editar Ubicación</h3><button onClick={() => setShowUbicacionModal(false)} className="p-2 bg-slate-100 rounded-full"><X size={20} /></button></div>
                  <input className="w-full bg-slate-50 p-4 rounded-2xl text-sm font-bold uppercase" value={ubicacionEditando.nombre || ''} onChange={e => setUbicacionEditando({ ...ubicacionEditando, nombre: e.target.value })} />
                  <div className="flex gap-4 mt-6"><button onClick={() => setShowUbicacionModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-xs">Cancelar</button><button onClick={handleSaveUbicacionWrapper} className="flex-1 py-3 bg-[#2D1B69] text-[#FFD700] rounded-xl font-bold text-xs">Guardar Cambios</button></div>
                </div>
              </div>
            )}

            {showUserModal && (
              <div className="fixed inset-0 bg-[#2D1B69]/60 backdrop-blur-md z-300 flex items-center justify-center p-4">
                <div className="bg-white p-8 md:p-10 rounded-3xl w-full max-w-lg shadow-2xl">
                  <div className="flex justify-between items-center mb-8"><div><h3 className="font-black text-[#2D1B69] uppercase italic text-xl">Editar Perfil</h3><p className="text-[10px] text-slate-400 font-bold uppercase">Actualización de credenciales</p></div><button onClick={() => setShowUserModal(false)} className="p-3 bg-slate-100 rounded-full"><X /></button></div>
                  <form onSubmit={handleSaveUserWrapper} className="space-y-5">
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nombre Completo</label><input className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold" value={userFormData.full_name} onChange={e => setUserFormData({ ...userFormData, full_name: e.target.value })} /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Cédula</label><input className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-mono font-bold" value={userFormData.cedula} onChange={e => setUserFormData({ ...userFormData, cedula: e.target.value })} /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Rol</label><select className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold" value={userFormData.role} onChange={e => setUserFormData({ ...userFormData, role: e.target.value })}><option value="admin">Administrador</option><option value="encargado">Encargado</option><option value="espectador">Espectador</option></select></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Correo</label><input className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold" value={userFormData.email} onChange={e => setUserFormData({ ...userFormData, email: e.target.value })} /></div>
                    <div><label className="text-[10px] font-black text-slate-400 uppercase ml-2 mb-1 block">Nueva Contraseña</label><div className="relative"><input type={showPassword ? "text" : "password"} className="w-full border-none bg-slate-50 p-4 rounded-2xl text-sm font-bold" placeholder="••••••••" value={userFormData.password} onChange={e => setUserFormData({ ...userFormData, password: e.target.value })} /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-slate-400">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></div>
                    <div className="flex gap-4 pt-6"><button type="button" onClick={() => setShowUserModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black uppercase text-[10px]">Cancelar</button><button type="submit" className="flex-1 py-4 bg-[#2D1B69] text-[#FFD700] rounded-2xl font-black uppercase text-[10px] shadow-xl">Guardar Cambios</button></div>
                  </form>
                </div>
              </div>
            )}

            {showModal && (
              <div className="fixed inset-0 bg-[#2D1B69]/80 backdrop-blur-md z-200 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center px-6 py-5 border-b border-slate-100"><h3 className="text-[#2D1B69] font-black text-xl uppercase">Ficha Técnica de Artículo</h3><button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full"><X size={18} /></button></div>
                  <form onSubmit={handleSaveItemWrapper} className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                      <div className="space-y-3 lg:col-span-1">
                        <label className="text-[11px] font-black uppercase text-slate-500 block">Imagen del Artículo</label>
                        <div className="aspect-square w-full bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                          {formData.imagen_url ? (
                            <><img src={getProxyImageUrl(formData.imagen_url)} className="w-full h-full object-cover" /><button type="button" onClick={() => setFormData({ ...formData, imagen_url: "" })} className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full"><X size={14} /></button></>
                          ) : (
                            <div className="flex flex-col items-center gap-3 p-4"><Upload size={36} className="text-slate-300" /><label className="cursor-pointer bg-[#2D1B69] text-white px-4 py-2 rounded-lg text-xs font-bold">{uploadingImage ? <Loader2 size={14} className="animate-spin inline" /> : "Subir Imagen"}<input type="file" className="hidden" accept="image/*" onChange={handleImageUploadWrapper} disabled={uploadingImage} /></label><button type="button" onClick={handleDriveLink} className="text-[10px] font-bold text-indigo-500 hover:underline">o vincular desde Drive</button></div>
                          )}
                        </div>
                        {uploadingImage && <p className="text-center text-xs text-blue-500 animate-pulse">Subiendo imagen a Google Drive...</p>}
                      </div>
                      <div className="space-y-4 lg:col-span-2">
                        <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Nombre del Artículo *</label><input required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Estado *</label><select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value })}><option>Bueno</option><option>Regular</option><option>Malo / Dañado</option></select></div>
                          <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Ubicación *</label><select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })}><option value="">Seleccionar...</option>{ubicaciones.map(u => <option key={u.id} value={u.nombre}>{u.nombre}</option>)}</select></div>
                        </div>
                        <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Responsable *</label>
                          {!nuevoResponsableInput ? (
                            <div className="flex gap-2"><select required className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={formData.responsable_nombre} onChange={(e) => setFormData({ ...formData, responsable_nombre: e.target.value })}><option value="">Seleccionar responsable...</option>{responsablesExistentes.map(resp => <option key={resp} value={resp}>{resp}</option>)}</select><button type="button" onClick={() => { setNuevoResponsableInput(true); setFormData({ ...formData, responsable_nombre: "" }); }} className="bg-[#FFD700] text-[#2D1B69] px-4 rounded-xl text-xs font-bold">+ Nuevo</button></div>
                          ) : (
                            <div className="flex gap-2"><input required className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" placeholder="Escribir nuevo responsable..." value={formData.responsable_nombre} onChange={(e) => setFormData({ ...formData, responsable_nombre: e.target.value })} /><button type="button" onClick={() => { setNuevoResponsableInput(false); setFormData({ ...formData, responsable_nombre: "" }); }} className="bg-slate-200 text-slate-600 px-4 rounded-xl text-xs font-bold">Cancelar</button></div>
                          )}
                        </div>
                        <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Código Interno</label><div className="flex gap-2"><input className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 font-mono text-sm text-[#2D1B69] font-bold" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} placeholder="Automático" /><button type="button" onClick={() => { const prefijo = formData.tipo_contable === "Activo" ? "ACT" : "PAS"; setFormData({ ...formData, codigo: `${prefijo}-${Math.floor(1000 + Math.random() * 9000)}` }); }} className="bg-[#FFD700] text-[#2D1B69] px-4 rounded-xl flex items-center gap-1"><RefreshCcw size={14} /> Generar</button></div></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Cantidad *</label><input type="number" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold" value={formData.stock} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) })} /></div><div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Categoría *</label><select required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={formData.categoria} onChange={(e) => { const cat = e.target.value; setFormData({ ...formData, categoria: cat, tipo_contable: CATEGORIAS_CONFIG[cat] }); }}>{Object.keys(CATEGORIAS_CONFIG).map(c => <option key={c}>{c}</option>)}</select></div></div>
                        <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Fecha de Adquisición</label><input type="date" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={formData.fecha_adquisicion} onChange={(e) => setFormData({ ...formData, fecha_adquisicion: e.target.value })} /></div>
                        <div><label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Observaciones</label><textarea rows={3} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm resize-none" placeholder="Detalles físicos: color, material, dimensiones..." value={formData.observaciones} onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })} /></div>
                      </div>
                    </div>
                    <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3"><button type="button" onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-xl font-black uppercase tracking-wider">Cancelar</button><button type="submit" className="flex-1 bg-[#2D1B69] text-[#FFD700] py-4 rounded-xl font-black uppercase tracking-wider shadow-lg">{formData.id ? "Actualizar Artículo" : "Registrar Artículo"}</button></div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </ToastContext.Provider>
  );
}