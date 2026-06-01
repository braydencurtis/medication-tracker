import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Unauthorized', { status: 401 });

    // Verify the calling user via their JWT
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) return new Response('Unauthorized', { status: 401 });

    // Use service role for all data access (bypasses RLS to read other users' tokens)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { doseLogId } = await req.json();

    // Fetch dose log with medication and pet info
    const { data: log, error: logError } = await admin
      .from('dose_logs')
      .select(`
        id, given_at, given_by,
        medications (
          name, pet_name, family_id,
          pets ( name )
        )
      `)
      .eq('id', doseLogId)
      .single();

    if (logError || !log || !log.given_at) {
      return new Response('OK', { status: 200 });
    }

    const medication = log.medications as {
      name: string;
      pet_name: string | null;
      family_id: string;
      pets: { name: string } | null;
    };
    const familyId = medication.family_id;
    const petName = medication.pets?.name ?? medication.pet_name ?? 'your pet';
    const medName = medication.name;
    const givenBy = log.given_by ?? 'Someone';

    // Get other approved family members (excluding the person who gave the dose)
    const { data: members, error: membersError } = await admin
      .from('family_members')
      .select('user_id')
      .eq('family_id', familyId)
      .eq('status', 'approved')
      .neq('user_id', user.id);

    if (membersError || !members?.length) {
      return new Response('OK', { status: 200 });
    }

    const memberIds = members.map((m: { user_id: string }) => m.user_id);

    // Get push tokens for those members
    const { data: tokenRows, error: tokensError } = await admin
      .from('push_tokens')
      .select('token')
      .in('user_id', memberIds);

    if (tokensError || !tokenRows?.length) {
      return new Response('OK', { status: 200 });
    }

    const messages = tokenRows.map(({ token }: { token: string }) => ({
      to: token,
      title: `${petName}'s medication given`,
      body: `${givenBy} gave ${petName} ${medName}`,
      sound: 'default',
    }));

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(messages),
    });

    return new Response('OK', { status: 200 });
  } catch (e) {
    console.error('notify-dose-given error:', e);
    return new Response('Internal error', { status: 500 });
  }
});
