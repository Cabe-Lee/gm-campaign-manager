// GET /api/health: reports whether the database is reachable (F1 FR-3).
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from('campaigns')
      .select('id', { count: 'exact', head: true });

    if (error) throw error;
    return NextResponse.json({ status: 'ok', db: 'up' });
  } catch {
    return NextResponse.json({ status: 'degraded', db: 'down' }, { status: 503 });
  }
}
