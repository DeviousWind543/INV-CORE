'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { X, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // 1. Intentar inicio de sesión
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (authError) {
      setError('Acceso Denegado');
      setLoading(false);
      return;
    }

    if (authData.user) {
      try {
        // 2. Consultar el rol en la tabla profiles
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authData.user.id)
          .single();

        if (profileError || !profile) {
          // Si no hay perfil, por defecto es espectador o mandamos a la raíz
          router.push('/');
          return;
        }

        // 3. Redirección basada en el rol
        switch (profile.role) {
          case 'admin':
            router.push('/admin/dashboard');
            break;
          case 'encargado':
            router.push('/Encargado');
            break;
          case 'espectador':
          default:
            router.push('/');
            break;
        }
      } catch (err) {
        console.error('Error de redirección:', err);
        router.push('/');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 md:p-6 relative overflow-hidden bg-[#070510]">
      
      {/* MESH GRADIENT */}
      <div className="absolute top-[-15%] left-[-10%] w-[70%] h-[70%] rounded-full bg-[#CA8A04] opacity-[0.12] blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[80%] h-[80%] rounded-full bg-[#4C1D95] opacity-[0.25] blur-[150px]"></div>

      {/* CUADRO DE ACCESO */}
      <div className="w-full max-w-[350px] bg-[#0F0D19]/80 backdrop-blur-3xl border border-white/5 p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10 rounded-sm">
        
        <div className="text-center mb-10">
          <h1 className="text-white text-2xl font-serif tracking-[0.6em] uppercase">
            Acceso
          </h1>
          <div className="w-6 h-[1px] bg-[#CA8A04] mx-auto mt-4 opacity-40"></div>
        </div>

        <form onSubmit={handleLogin} className="space-y-8">
          <div className="group border-b border-white/10 pb-1.5 focus-within:border-[#CA8A04] transition-all duration-700">
            <label className="block text-[8px] text-white/30 uppercase tracking-[0.4em] mb-1">CORREO / EMAIL</label>
            <input
              type="email"
              required
              className="w-full bg-transparent text-white text-xs outline-none tracking-wider py-1"
              placeholder="usuario@sistema.com"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="group border-b border-white/10 pb-1.5 focus-within:border-[#CA8A04] transition-all duration-700 relative">
            <label className="block text-[8px] text-white/30 uppercase tracking-[0.4em] mb-1">CONTRASEÑA</label>
            <div className="flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                required
                className="w-full bg-transparent text-white text-xs outline-none tracking-[0.5em] py-1"
                placeholder="••••••••"
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-white/20 hover:text-[#CA8A04] ml-2"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {error && <p className="text-[#CA8A04] text-[8px] text-center uppercase tracking-[0.3em] font-bold italic animate-pulse">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full border border-[#CA8A04]/20 py-4 text-white text-[9px] font-black uppercase tracking-[0.5em] hover:bg-white hover:text-black hover:border-white transition-all duration-700 disabled:opacity-20"
          >
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-10 text-center pt-6 border-t border-white/5">
          <button 
            onClick={() => router.push('/register')}
            className="text-white/20 hover:text-[#CA8A04] text-[8px] font-bold tracking-[0.4em] transition-all duration-300 uppercase underline underline-offset-4 decoration-[#CA8A04]/10"
          >
            Registrar Nuevo Perfil
          </button>
        </div>
      </div>
    </div>
  );
}