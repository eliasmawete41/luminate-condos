import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Método não permitido. Use POST." }, 405);
  }

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  // Validação simples e tolerante (aceita números como string)
  const num = (v: unknown, def = 0) => {
    const n = typeof v === "string" ? parseFloat(v) : (v as number);
    return Number.isFinite(n) ? n : def;
  };
  const str = (v: unknown, def = "DESLIGADO") =>
    typeof v === "string" && v.length > 0 ? v : def;

  const leitura = {
    ldr: Math.trunc(num(payload.ldr)),
    poste_bom_status: str(payload.poste_bom_status),
    corrente_poste_bom: num(payload.corrente_poste_bom),
    potencia_poste_bom: num(payload.potencia_poste_bom),
    poste_estragado_status: str(payload.poste_estragado_status),
    corrente_poste_estragado: num(payload.corrente_poste_estragado),
    potencia_poste_estragado: num(payload.potencia_poste_estragado),
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data, error } = await supabase
    .from("esp32_leituras")
    .insert(leitura)
    .select("id")
    .single();

  if (error) {
    console.error("Erro ao inserir leitura:", error);
    return json({ error: error.message }, 500);
  }

  return json({ ok: true, id: data.id });
});