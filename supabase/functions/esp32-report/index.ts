import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cabecalhosCors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: cabecalhosCors })
  }

  try {
    const urlSupabase = Deno.env.get('SUPABASE_URL')!
    const chaveServico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(urlSupabase, chaveServico)

    const corpo = await req.json()
    const { device_token, is_on, fault_detected, fault_type, power_consumption_watts, latitude, longitude, raw_data } = corpo

    if (!device_token) {
      return new Response(JSON.stringify({ error: 'device_token é obrigatório' }), {
        status: 400,
        headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
      })
    }

    // Verificar se o dispositivo existe e está aprovado
    const { data: dispositivo, error: erroDispositivo } = await supabase
      .from('esp32_devices')
      .select('id, pole_id, status, name')
      .eq('device_token', device_token)
      .maybeSingle()

    if (erroDispositivo || !dispositivo) {
      return new Response(JSON.stringify({ error: 'Dispositivo não encontrado' }), {
        status: 404,
        headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
      })
    }

    if (dispositivo.status !== 'aprovado') {
      return new Response(JSON.stringify({ error: 'Dispositivo não aprovado' }), {
        status: 403,
        headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
      })
    }

    // Atualizar última atividade
    await supabase
      .from('esp32_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', dispositivo.id)

    // Inserir leitura
    const { error: erroLeitura } = await supabase
      .from('device_readings')
      .insert({
        device_id: dispositivo.id,
        pole_id: dispositivo.pole_id,
        is_on: is_on ?? true,
        fault_detected: fault_detected ?? false,
        fault_type,
        power_consumption_watts,
        latitude,
        longitude,
        raw_data,
      })

    if (erroLeitura) {
      console.error('Erro ao inserir leitura:', erroLeitura)
      return new Response(JSON.stringify({ error: 'Falha ao salvar leitura' }), {
        status: 500,
        headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
      })
    }

    // Se falha detectada, criar manutenção e notificar monitores
    if (fault_detected && dispositivo.pole_id) {
      // Mapear tipo de falha para enum
      const mapasTipoFalha: Record<string, string> = {
        'lampada_queimada': 'lampada_queimada',
        'curto_circuito': 'curto_circuito',
        'oscilacao': 'oscilacao',
        'fiacao_danificada': 'fiacao_danificada',
        'poste_danificado': 'poste_danificado',
      }
      const tipoFalhaMapeado = mapasTipoFalha[fault_type || ''] || 'outros'

      // Verificar se já existe manutenção aberta para este poste
      const { data: manutencaoExistente } = await supabase
        .from('maintenances')
        .select('id')
        .eq('pole_id', dispositivo.pole_id)
        .in('status', ['aberto', 'em_andamento'])
        .maybeSingle()

      if (!manutencaoExistente) {
        // Criar manutenção
        const { data: manutencao, error: erroManutencao } = await supabase
          .from('maintenances')
          .insert({
            pole_id: dispositivo.pole_id,
            description: `Falha detectada automaticamente pelo dispositivo "${dispositivo.name}": ${fault_type || 'tipo não especificado'}`,
            failure_type: tipoFalhaMapeado,
            priority: 'alta',
            status: 'aberto',
          })
          .select('id')
          .single()

        if (erroManutencao) {
          console.error('Erro ao criar manutenção:', erroManutencao)
        }

        // Atualizar status do poste
        await supabase
          .from('poles')
          .update({ status: 'com_falha' })
          .eq('id', dispositivo.pole_id)

        // Notificar todos os monitores (síndico, subsíndico, manutenção, admin)
        const { data: monitores } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'manutencao'])

        if (monitores && manutencao) {
          const notificacoes = monitores.map(m => ({
            user_id: m.user_id,
            title: '⚡ Falha detectada automaticamente',
            message: `O dispositivo "${dispositivo.name}" detectou uma falha do tipo "${fault_type || 'desconhecido'}" no poste associado.`,
            type: 'alerta',
            related_pole_id: dispositivo.pole_id,
            related_maintenance_id: manutencao.id,
          }))

          const { error: erroNotificacao } = await supabase
            .from('notifications')
            .insert(notificacoes)

          if (erroNotificacao) {
            console.error('Erro ao criar notificações:', erroNotificacao)
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
    })
  } catch (erro) {
    console.error('Erro:', erro)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500,
      headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
    })
  }
})
