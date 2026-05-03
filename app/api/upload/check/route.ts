import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data } = await supabase
      .from('drive_config')
      .select('access_token, updated_at')
      .eq('id', 1)
      .single();
    
    const hasToken = !!data?.access_token;
    
    return NextResponse.json({ 
      connected: hasToken,
      lastRefresh: data?.updated_at || null
    });
  } catch {
    return NextResponse.json({ connected: false });
  }
}