import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? '';

export async function GET() {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 'default')
      .limit(1)
      .single();

    if (error) {
      console.error('[site-settings][GET]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (e: any) {
    console.error('[site-settings][GET] fatal', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = request.headers.get('x-admin-password') ?? '';
    if (auth !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { phone, email, instagram_url, facebook_url } = await request.json();

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
      console.error('[site-settings][POST]', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (e: any) {
    console.error('[site-settings][POST] fatal', e);
    return NextResponse.json({ error: e?.message ?? 'Server error' }, { status: 500 });
  }
}
