// supabase-client.js — connexion au projet Supabase
// La clé ici est la clé PUBLIQUE (anon/publishable) — normal qu'elle soit
// visible dans le code, elle est faite pour ça. Elle ne donne accès
// qu'à ce qu'on autorise explicitement côté serveur (voir schema.sql).

const SUPABASE_URL = 'https://jhmffbpnxwzoqmzrdoez.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_EU6YNaR_8DIgd1d5afTrmA_NDKZtrEN';
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/admin-api`;

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Appelle l'Edge Function admin-api (liste, ajout, mise à jour patients)
async function callAdminApi(adminPin, action, payload = {}) {
  try {
    const res = await fetch(EDGE_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ admin_pin: adminPin, action, payload }),
    });
    if (!res.ok) {
      const text = await res.text();
      return { error: `Serveur (${res.status}) : ${text.slice(0, 200)}` };
    }
    return await res.json();
  } catch (e) {
    return { error: `Impossible de joindre le serveur — l'Edge Function admin-api est-elle bien déployée ? (${e.message})` };
  }
}
