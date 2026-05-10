import { type NextRequest } from 'next/server';
import { createClient } from '@/utils/supabase/middleware';

/**
 * Refreshes the Supabase session cookie on every request so it never
 * expires mid-session.
 */
export async function proxy(request: NextRequest) {
  const { supabaseResponse } = createClient(request);
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
