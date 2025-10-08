import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

export async function GET() {
  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .eq('id', 'default')
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  // jednoduchá ochrana: heslo v hlavičke
  const auth = request.headers.get('x-admin-password') ?? '';
  if (auth !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { phone, email, instagram_url, facebook_url } = body;

  const supabase = getServiceClient();
  const { data, error } = await supabase
    .from('site_settings')
    .upsert(
      {
        id: 'default',
        phone: phone ?? null,
        email: email ?? null,
        instagram_url: instagram_url ?? null,
        facebook_url: facebook_url ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
