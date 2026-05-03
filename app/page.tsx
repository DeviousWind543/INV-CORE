'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowUpRight, 
  ShieldCheck, 
  Globe, 
  Zap, 
  Package,
  BarChart3,
  Loader2
} from 'lucide-react';
import Image from 'next/image';

export default function InventoryLanding() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // LÓGICA DE REDIRECCIÓN CORREGIDA
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          if (profile.role === 'admin') {
            router.push('/admin/dashboard');
          } else if (profile.role === 'encargado') {
            router.push('/Encargado');
          } else if (profile.role === 'espectador') {
            router.push('/Espectador');
          } else {
            setCheckingAuth(false);
          }
        } else {
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    };

    checkUser();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <Loader2 className="text-amber-500 animate-spin w-8 h-8 opacity-20" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-gold-500/30">
      {/* Navbar Minimalista */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* ← LOGO CAMBIADO AQUÍ */}
            <div className="w-10 h-10 relative">
              <img 
                src="/logo.png" 
                alt="INV-CORE Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-medium tracking-tight font-serif italic">INV-CORE</span>
          </div>
          
          <div className="hidden md:flex items-center gap-10 text-sm font-light tracking-wide text-zinc-400">
            <a href="#ecosistema" className="hover:text-amber-200 transition-colors">Ecosistema</a>
            <a href="#seguridad" className="hover:text-amber-200 transition-colors">Seguridad</a>
            <a href="#partners" className="hover:text-amber-200 transition-colors">Partners</a>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/login')}
              className="text-sm font-light text-zinc-400 hover:text-white transition-colors"
            >
              Iniciar Sesión
            </button>
            <button 
              onClick={() => router.push('/login')}
              className="bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-amber-100 transition-all duration-300"
            >
              Regístrate
            </button>
          </div>
        </div>
      </nav>

      <main className="pt-32">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-500 text-xs font-medium tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              Standard de Oro en Inventarios
            </div>
            
            <h1 className="text-6xl md:text-7xl font-serif leading-[1.1] tracking-tight">
              Control total para <br />
              <span className="bg-gradient-to-r from-white via-zinc-400 to-zinc-600 bg-clip-text text-transparent">
                activos de élite.
              </span>
            </h1>

            <p className="text-zinc-500 text-lg font-light leading-relaxed max-w-md">
              Una plataforma diseñada para quienes demandan precisión quirúrgica y una estética impecable en la gestión de stocks globales.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button 
                onClick={() => router.push('/login')}
                className="group relative bg-zinc-900 border border-white/10 px-8 py-4 rounded-xl flex items-center justify-center gap-3 hover:border-amber-500/50 transition-all"
              >
                <span>Comenzar ahora</span>
                <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
              </button>
              <button className="px-8 py-4 text-zinc-400 hover:text-white transition-colors flex items-center justify-center gap-2">
                Ver video demostrativo
              </button>
            </div>
          </div>

          {/* Visualización Dashboard Preview */}
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-amber-500/20 to-purple-500/20 blur-2xl opacity-30"></div>
            <div className="relative bg-[#0F0F11] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/20"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500/20"></div>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Global Analytics v2.0</div>
              </div>
              
              <div className="p-8 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Valor de Activos</p>
                    <p className="text-2xl font-serif mt-1">$4.2M</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Eficiencia Operativa</p>
                    <p className="text-2xl font-serif mt-1 text-amber-500">98.4%</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-end">
                    <h3 className="text-sm font-light">Flujo de Stock Semanal</h3>
                    <BarChart3 className="w-4 h-4 text-zinc-600" />
                  </div>
                  <div className="flex gap-2 h-32 items-end">
                    {[40, 70, 45, 90, 65, 80, 100].map((h, i) => (
                      <div 
                        key={i} 
                        className="flex-1 bg-gradient-to-t from-amber-500/20 to-amber-500/50 rounded-sm hover:from-amber-400 transition-all cursor-pointer" 
                        style={{ height: `${h}%` }}
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sección de Ecosistema e Información */}
        <section id="ecosistema" className="max-w-7xl mx-auto px-6 py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-12 bg-[#050505] space-y-4">
              <Zap className="w-8 h-8 text-amber-500/80" />
              <h4 className="text-3xl font-serif italic">Ecosistema Intuitivo</h4>
              <p className="text-sm text-zinc-500 font-light leading-relaxed">
                Nuestra plataforma INV-CORE ha sido desarrollada bajo una arquitectura de microservicios sobre **Next.js 14**, garantizando una fluidez absoluta. 
                Es una interfaz quirúrgicamente intuitiva que reduce el esfuerzo cognitivo, permitiendo que la gestión de activos sea tan natural como un parpadeo. 
                Tecnología de élite para un control sin fricciones.
              </p>
            </div>
            <div id="seguridad" className="p-12 bg-[#050505] space-y-4">
              <ShieldCheck className="w-8 h-8 text-amber-500/80" />
              <h4 className="text-3xl font-serif italic">Seguridad Inquebrantable</h4>
              <p className="text-sm text-zinc-500 font-light leading-relaxed">
                Protegemos su patrimonio con **Row Level Security (RLS)** y encriptación AES-256. 
                Nuestras políticas de seguridad incluyen acceso basado en roles (Admin, Encargado, Espectador) y auditoría constante de datos, asegurando que su información sensible permanezca bajo un blindaje digital impenetrable.
              </p>
            </div>
          </div>
        </section>

        {/* Sección Partners - Banner Tamaño Ajustado */}
        <section id="partners" className="max-w-7xl mx-auto px-6 py-24 text-center">
          <div className="space-y-12">
            <div className="space-y-4">
              <h4 className="text-xs uppercase tracking-[0.4em] text-zinc-500">Respaldado por</h4>
              <div className="flex justify-center items-center py-4">
                <img 
                  src="/banner 2026_Mesa de trabajo 1.png" 
                  alt="Deviouswind Logo" 
                  className="h-24 md:h-44 w-auto object-contain hover:scale-105 transition-all duration-700"
                />
              </div>
              <h3 className="text-2xl font-serif italic tracking-wider">Deviouswind S.A</h3>
            </div>
            
            <p className="max-w-2xl mx-auto text-zinc-500 text-sm font-light leading-relaxed">
              INV-CORE es una obra de ingeniería de Deviouswind. Esta plataforma se mantiene en línea gracias a la potencia de Supabase, Vercel y Tailwind Labs, marcas líderes que garantizan un uptime del 99.9% y una estética visual incomparable. 
              Mantenemos su sistema operando en la frontera de lo posible.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12 text-center text-zinc-600 text-xs tracking-[0.2em] uppercase font-light">
        © 2026 INV-CORE — deviouswind · Privacidad · Términos · Legal
      </footer>
    </div>
  );
}