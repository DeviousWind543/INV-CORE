// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Detectar si estamos en el cliente
const isClient = typeof window !== 'undefined';

// Solo importar Capacitor en el cliente
let capacitorStorage: any = null;
let isNative = false;

if (isClient) {
  try {
    const { Capacitor } = require('@capacitor/core');
    const { Preferences } = require('@capacitor/preferences');
    isNative = Capacitor.isNativePlatform();
    
    capacitorStorage = {
      getItem: async (key: string) => {
        const { value } = await Preferences.get({ key });
        return value;
      },
      setItem: async (key: string, value: string) => {
        await Preferences.set({ key, value });
      },
      removeItem: async (key: string) => {
        await Preferences.remove({ key });
      }
    };
  } catch (e) {
    console.log('Capacitor no disponible en este entorno');
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: isClient && isNative && capacitorStorage ? capacitorStorage : 
             (isClient ? localStorage : undefined),
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: isClient && !isNative,
    flowType: 'pkce'
  }
});