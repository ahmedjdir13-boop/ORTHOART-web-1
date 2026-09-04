// admin-api — Edge Function Supabase
//
// C'est la SEULE porte d'entrée pour les actions admin (ajouter un patient,
// modifier sa progression). Elle tourne côté serveur avec la clé
// service_role (jamais exposée au navigateur), et vérifie à chaque appel
// que le code à 6 chiffres fourni correspond bien à un compte admin.
//
// Déploiement : supabase functions deploy admin-api --no-verify-jwt
// Secret requis : SUPABASE_SERVICE_ROLE_KEY (Project Settings > API)
//                  → à définir avec : supabase secrets set SUPABASE_SERVICE_ROLE_KEY=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("PROJECT_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variable");
}

// Client "admin" — droits complets, jamais envoyé au client
const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { admin_pin, action, payload = {} } = await req.json();

    // ---- Étape 1 : vérifier que ce code appartient bien à un admin ----
    const { data: authData, error: authErr } = await admin.rpc("verify_pin", {
      input_pin: admin_pin,
    });
    const account = authData?.[0];

    if (authErr || !account || account.role !== "admin") {
      return new Response(JSON.stringify({ error: "Accès refusé" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---- Étape 2 : exécuter l'action demandée ----
    if (action === "list_patients") {
      const { data, error } = await admin
        .from("accounts")
        .select("id, name, pin_plain, progress(step, total_steps, next_appointment, flames, favorite, last_note, last_progress_delta, last_flame_delta)")
        .eq("role", "patient");
      if (error) throw error;
      return new Response(JSON.stringify({ patients: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action === "add_patient") {
      const newPin = String(Math.floor(100000 + Math.random() * 900000));
      const treatmentType = payload.treatment_type === "multi_attache" ? "multi_attache" : "gouttiere";
      const totalSteps = treatmentType === "gouttiere"
        ? (parseInt(payload.total_steps, 10) || 12)
        : 100;
      const { data, error } = await admin.rpc("add_patient", {
        input_name: payload.name,
        input_pin: newPin,
        input_treatment_type: treatmentType,
        input_total_steps: totalSteps,
      });
      if (error) throw error;
      return new Response(JSON.stringify({ id: data, pin: newPin }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "log_session") {
      const { data: currentProgress, error: readErr } = await admin
        .from("progress")
        .select("step, total_steps, flames")
        .eq("account_id", payload.account_id)
        .single();
      if (readErr) throw readErr;

      const { count: betterBefore } = await admin
        .from("progress").select("*", { count: "exact", head: true })
        .gt("flames", currentProgress.flames);
      const rankBefore = (betterBefore ?? 0) + 1;

      const stepDelta = (payload.progress_delta ?? 0) / 100 * currentProgress.total_steps;
      const newStep = Math.max(0, Math.min(
        currentProgress.step + stepDelta,
        currentProgress.total_steps
      ));
      const newFlames = Math.max(0, currentProgress.flames + (payload.flame_delta ?? 0));

      const { count: betterAfter } = await admin
        .from("progress").select("*", { count: "exact", head: true })
        .gt("flames", newFlames);
      const rankAfter = (betterAfter ?? 0) + 1;

      const { error: sessErr } = await admin.from("sessions").insert({
        account_id: payload.account_id,
        note: payload.note ?? null,
        progress_delta: payload.progress_delta ?? 0,
        flame_delta: payload.flame_delta ?? 0,
      });
      if (sessErr) throw sessErr;

      const { error } = await admin
        .from("progress")
        .update({
          step: newStep,
          flames: newFlames,
          last_note: payload.note ?? null,
          last_progress_delta: payload.progress_delta ?? 0,
          last_flame_delta: payload.flame_delta ?? 0,
          next_appointment: payload.next_appointment ?? undefined,
        })
        .eq("account_id", payload.account_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "get_history") {
      const { data, error } = await admin
        .from("sessions")
        .select("note, progress_delta, flame_delta, created_at")
        .eq("account_id", payload.account_id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return new Response(JSON.stringify({ history: data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "toggle_favorite") {
      const { data: cur, error: readErr } = await admin
        .from("progress").select("favorite").eq("account_id", payload.account_id).single();
      if (readErr) throw readErr;
      const { error } = await admin
        .from("progress").update({ favorite: !cur.favorite }).eq("account_id", payload.account_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "delete_patient") {
      const { error } = await admin.from("accounts").delete().eq("id", payload.account_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
