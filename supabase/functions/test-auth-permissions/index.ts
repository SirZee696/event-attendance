import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

console.log('Auth test function loaded. Ready to serve requests.');

Deno.serve(async (_req) => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceKey) {
      throw new Error('FATAL: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set in environment!');
    }

    console.log('--- Initializing Admin Client ---');
    // This is the standard and recommended way to create a service-role client
    // for server-side operations. It disables all browser-specific session logic.
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

    console.log('--- Attempting to list users with auth.admin API ---');
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers();

    if (error) {
      console.error('--- TEST FAILED ---');
      throw error;
    } else {
      console.log(`--- TEST PASSED: Successfully listed ${users.length} users. ---`);
      return new Response(JSON.stringify({ message: `Test passed. Found ${users.length} users.` }), { status: 200 });
    }
  } catch (e) {
    console.error('--- TEST FAILED WITH EXCEPTION ---');
    console.error(e.message);
    return new Response(JSON.stringify({ error: e.message, stack: e.stack }), { status: 500 });
  }
})