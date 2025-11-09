/// <reference lib="deno.ns" />
/// <reference types="https://esm.sh/@supabase/supabase-js@2.43.4/dist/module/index.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SMTPClient } from 'https://deno.land/x/denomailer@1.6.0/mod.ts'

const GMAIL_USER = Deno.env.get('GMAIL_USER');
const GMAIL_APP_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to ensure consistent response headers
const createResponse = (body, status, headers = {}) => {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers } });
};

Deno.serve(async (req) => {
  // This is needed if you're planning to invoke your function from a browser.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }});
  }

  try {
    const { eventId } = await req.json()

    if (!eventId) {
      console.warn("Request received without an eventId.");
      throw new Error("Event ID is required.");
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        // This is the standard and recommended way to create a service-role client
        // for server-side operations. It disables all browser-specific session logic.
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    )

    // 1. Fetch the event details
    const { data: event, error: eventError } = await supabaseAdmin
      .from('events')
      .select('title, description, start_time, location, target_roles, target_units, target_year_levels, target_sections')
      .eq('id', eventId)
      .single()

    if (eventError) {
      console.error('Error fetching event:', eventError);
      throw eventError;
    }
    if (!event) throw new Error(`Event with ID ${eventId} not found.`);

    // If no target roles, it's a public event. We won't email everyone.
    if (!event.target_roles || event.target_roles.length === 0) {
      console.log('Event is public. No notifications will be sent.');
      return createResponse({ message: 'This is a public event; no notifications were sent.' }, 200);
    }

    // 2. Fetch all users using the admin client.
    const { data: { users: authUsers }, error: usersError } = await supabaseAdmin.auth.admin.listUsers();

    // 2.1 Fetch all profiles to get user roles and other metadata
    const { data: profiles, error: profilesError } = await supabaseAdmin
      .from('profiles')
      .select('id, user_role, unit, year, section'); // Select relevant profile fields

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    const profilesMap = new Map(profiles.map(p => [p.id, p])); // Map profiles by user ID for quick lookup

    if (usersError) {
      console.error('Error fetching users with admin client:', usersError);
      throw usersError;
    }
    
    // 3. Filter users based on event target criteria, using profile data
    const targetUsers = authUsers.filter(user => {
      // Log the user and event data we are comparing
      console.log(`\n--- Checking user: ${user.email} (ID: ${user.id}) ---`);

      const profile = profilesMap.get(user.id); // Get the corresponding profile
      if (!profile) {
        console.log(`Filter fail: No profile found for user ID: ${user.id}.`);
        return false;
      }

      const userRole = profile.user_role; // Use role from the profile
      console.log(`User role: ${userRole}, Event target roles: ${event.target_roles}`);

      // Must have a role that is in the event's target roles
      if (!userRole || !event.target_roles.includes(userRole)) {
        console.log('Filter fail: Role not in target roles.');
        return false;
      }
      console.log('Filter pass: Role is in target roles.');

      // If the role is not student/faculty/staff, role match is enough
      if (!['student', 'faculty', 'staff'].includes(userRole)) {
        console.log('Filter pass: Role matched and is not student/faculty/staff.');
        return true;
      }
      console.log('User is student/faculty/staff, applying additional filters.');

      // For student/faculty/staff, check unit, year, and section from the profile
      console.log('Filtering by unit, year, and section for student/faculty/staff.');
      const unitMatch = !event.target_units || event.target_units.length === 0 || event.target_units.includes(profile.unit);
      console.log(`Unit match: ${unitMatch} (Event: ${event.target_units}, User: ${profile.unit})`);

      const yearLevelMatch = !event.target_year_levels || event.target_year_levels.length === 0 || event.target_year_levels.includes(profile.year);
      console.log(`Year level match: ${yearLevelMatch} (Event: ${event.target_year_levels}, User: ${profile.year})`);

      const sectionMatch = !event.target_sections || event.target_sections.length === 0 || event.target_sections.includes(profile.section);
      console.log(`Section match: ${sectionMatch} (Event: ${event.target_sections}, User: ${profile.section})`);
      
      const isMatch = unitMatch && yearLevelMatch && sectionMatch;
      console.log(`Final match for this user: ${isMatch}`);
      return isMatch;
    });
    
    if (targetUsers.length === 0) {
      console.log('No target users found matching the event criteria.');
      return createResponse({ message: 'No target users found for this event.' }, 200);
    }
    
    const emailList = targetUsers.map((u) => u.email).filter(email => email);
    
    // 4. Send emails
    // Pass an empty object to the constructor to avoid a bug in the library
    // where it tries to access properties of an undefined options object.
    const client = new SMTPClient({
      connection: {
        hostname: 'smtp.gmail.com',
        port: 465,
        tls: true,
        auth: {
          username: GMAIL_USER,
          password: GMAIL_APP_PASSWORD,
        },
      },
    });
    
    const subject = `Event Notification: ${event.title}`;
    const htmlBody = `
      <h1>${event.title}</h1>
      <p><strong>Description:</strong> ${event.description || 'N/A'}</p>
      <p><strong>When:</strong> ${new Date(event.start_time).toLocaleString('en-US', { timeZone: 'Asia/Manila' })}</p>
      <p><strong>Where:</strong> ${event.location || 'TBD'}</p>
    `;
    
    console.log(`Attempting to connect to SMTP server and send email to ${emailList.length} users.`);
    
    await client.send({
      from: GMAIL_USER,
      to: GMAIL_USER,
      bcc: emailList,
      subject,
      html: htmlBody,
    });
    
    await client.close();
    
    console.log(`Successfully sent email for event: ${event.title}`);
    
    return createResponse({ message: `Email sent to ${emailList.length} users.` }, 200);
  } catch (error) {
    console.error("An error occurred in the function:", error);
    return createResponse({ error: error.message, stack: error.stack }, 500);
  }
});