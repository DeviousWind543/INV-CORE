'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Eye, EyeOff } from 'lucide-react';

export default function PaginaRegistro() {
  const router = useRouter();
  
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validación 1: Contraseñas coinciden
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    // Validación 2: Longitud mínima de contraseña
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      setLoading(false);
      return;
    }

    // Validación 3: Formato de cédula (solo números, 10 dígitos)
    if (!/^\d{10}$/.test(cedula)) {
      setError('La cédula debe contener exactamente 10 dígitos numéricos');
      setLoading(false);
      return;
    }

    // Validación 4: Formato de email básico
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Ingresa un correo electrónico válido');
      setLoading(false);
      return;
    }

    // Validación 5: Nombre no vacío
    if (nombre.trim().length < 3) {
      setError('El nombre debe tener al menos 3 caracteres');
      setLoading(false);
      return;
    }

    try {
      // Verificar si la cédula ya existe
      const { data: existingCedula, error: cedulaError } = await supabase
        .from('profiles')
        .select('id')
        .eq('cedula', cedula)
        .maybeSingle();

      if (cedulaError && cedulaError.code !== 'PGRST116') {
        console.error('Error verificando cédula:', cedulaError);
      }

      if (existingCedula) {
        setError('Ya existe un usuario registrado con esta cédula');
        setLoading(false);
        return;
      }

      // Crear usuario en auth
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre, cedula: cedula }
        }
      });

      if (signUpError) {
        if (signUpError.status === 422 || signUpError.message.includes('already')) {
          setError('Ya existe un usuario registrado con este correo electrónico');
        } else if (signUpError.message.includes('password')) {
          setError('La contraseña no cumple con los requisitos mínimos');
        } else {
          setError(signUpError.message);
        }
        setLoading(false);
        return;
      }

      // Guardar perfil en la tabla profiles
      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: authData.user.id,
          full_name: nombre.trim(),
          email: email.toLowerCase().trim(),
          cedula: cedula,
          role: 'espectador'
        });

        if (profileError) {
          console.error('Error al crear perfil:', profileError);
          
          // Si el perfil ya existe, es porque el usuario se creó pero el perfil no
          if (profileError.code === '23505') {
            // Intentar actualizar el perfil existente
            const { error: updateError } = await supabase.from('profiles')
              .update({
                full_name: nombre.trim(),
                email: email.toLowerCase().trim(),
                cedula: cedula
              })
              .eq('id', authData.user.id);
              
            if (updateError) {
              setError('Error al guardar los datos del perfil. Contacta al administrador.');
              setLoading(false);
              return;
            }
          } else {
            setError('Error al guardar los datos del perfil. Intenta de nuevo.');
            setLoading(false);
            return;
          }
        }
      }

      // Registro exitoso
      setSuccess(true);
      setLoading(false);
      setTimeout(() => router.push('/login'), 2500);

    } catch (err) {
      console.error('Error inesperado:', err);
      setError('Ocurrió un error inesperado. Intenta de nuevo más tarde.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-[#070510]">
      
      {/* MESH GRADIENT */}
      <div className="absolute top-[-10%] left-[-5%] w-[80%] h-[70%] rounded-full bg-[#CA8A04] opacity-[0.10] blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-[-15%] right-[-5%] w-[80%] h-[80%] rounded-full bg-[#4C1D95] opacity-[0.20] blur-[100px]"></div>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="w-full max-w-[700px] max-h-[95vh] overflow-y-auto bg-[#120F1F]/90 backdrop-blur-3xl border border-white/5 p-6 md:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.8)] relative z-10 rounded-sm scrollbar-hide">
        
        <div className="text-center mb-8">
          <h1 className="text-white text-xl md:text-2xl font-serif tracking-[0.5em] uppercase">
            Registro
          </h1>
          <div className="w-8 h-[1px] bg-[#CA8A04] mx-auto mt-3 opacity-40"></div>
        </div>

        {success ? (
          <div className="text-center py-12">
            <div className="text-[#CA8A04] text-4xl mb-4">✓</div>
            <h2 className="text-white text-lg font-serif tracking-[0.3em] uppercase mb-2">Registro Exitoso</h2>
            <p className="text-white/40 text-xs tracking-[0.2em]">Redirigiendo al inicio de sesión...</p>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
            
            {/* GRID DE CAMPOS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
              
              <div className="group border-b border-white/10 pb-1 focus-within:border-[#CA8A04] transition-all duration-500">
                <label className="block text-[8px] text-white/30 uppercase tracking-[0.3em] mb-1">Nombre Completo</label>
                <input 
                  type="text" 
                  required 
                  className="w-full bg-transparent text-white text-sm outline-none tracking-wider" 
                  placeholder="Michael Carrion" 
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  autoComplete="name"
                />
              </div>

              <div className="group border-b border-white/10 pb-1 focus-within:border-[#CA8A04] transition-all duration-500">
                <label className="block text-[8px] text-white/30 uppercase tracking-[0.3em] mb-1">Número de Cédula</label>
                <input 
                  type="text" 
                  required 
                  maxLength={10} 
                  className="w-full bg-transparent text-white text-sm outline-none tracking-wider" 
                  placeholder="0000000000" 
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value.replace(/\D/g, ''))}
                  autoComplete="off"
                />
              </div>

              <div className="group border-b border-white/10 pb-1 focus-within:border-[#CA8A04] transition-all duration-500 md:col-span-2">
                <label className="block text-[8px] text-white/30 uppercase tracking-[0.3em] mb-1">Correo Institucional</label>
                <input 
                  type="email" 
                  required 
                  className="w-full bg-transparent text-white text-sm outline-none tracking-wider" 
                  placeholder="nombre@ejemplo.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>

              <div className="group border-b border-white/10 pb-1 focus-within:border-[#CA8A04] transition-all duration-500 relative">
                <label className="block text-[8px] text-white/30 uppercase tracking-[0.3em] mb-1">Contraseña</label>
                <div className="flex items-center">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    required 
                    className="w-full bg-transparent text-white text-sm outline-none tracking-[0.3em]"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-white/20 hover:text-[#CA8A04] ml-2">
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="group border-b border-white/10 pb-1 focus-within:border-[#CA8A04] transition-all duration-500 relative">
                <label className="block text-[8px] text-white/30 uppercase tracking-[0.3em] mb-1">Confirmar Clave</label>
                <div className="flex items-center">
                  <input 
                    type={showConfirmPassword ? "text" : "password"} 
                    required 
                    className="w-full bg-transparent text-white text-sm outline-none tracking-[0.3em]"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-white/20 hover:text-[#CA8A04] ml-2">
                    {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 space-y-4">
              {error && (
                <div className="bg-[#CA8A04]/10 border border-[#CA8A04]/30 p-3 rounded-sm">
                  <p className="text-[#CA8A04] text-[8px] text-center uppercase tracking-[0.2em] font-bold">{error}</p>
                </div>
              )}
              
              <button
                type="submit"
                disabled={loading || success}
                className="w-full border border-[#CA8A04]/30 py-3.5 text-white text-[9px] font-black uppercase tracking-[0.4em] hover:bg-white hover:text-black hover:border-white transition-all duration-500 active:scale-95 disabled:opacity-20 shadow-lg"
              >
                {loading ? 'Sincronizando...' : 'Crear Cuenta'}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center pt-4 border-t border-white/5">
          <button 
            onClick={() => router.push('/login')}
            className="text-white/30 hover:text-[#CA8A04] text-[8px] font-bold tracking-[0.3em] transition-all duration-300 uppercase underline underline-offset-4 decoration-[#CA8A04]/20"
          >
            Regresar al ingreso
          </button>
        </div>
      </div>
    </div>
  );
}