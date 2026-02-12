import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json()
    const { device_token, is_on, fault_detected, fault_type, power_consumption_watts, latitude, longitude, raw_data } = body

    if (!device_token) {
      return new Response(JSON.stringify({ error: 'device_token is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify device exists and is approved
    const { data: device, error: deviceError } = await supabase
      .from('esp32_devices')
      .select('id, pole_id, status, name')
      .eq('device_token', device_token)
      .maybeSingle()

    if (deviceError || !device) {
      return new Response(JSON.stringify({ error: 'Device not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (device.status !== 'aprovado') {
      return new Response(JSON.stringify({ error: 'Device not approved' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Update last_seen
    await supabase
      .from('esp32_devices')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', device.id)

    // Insert reading
    const { error: readingError } = await supabase
      .from('device_readings')
      .insert({
        device_id: device.id,
        pole_id: device.pole_id,
        is_on: is_on ?? true,
        fault_detected: fault_detected ?? false,
        fault_type,
        power_consumption_watts,
        latitude,
        longitude,
        raw_data,
      })

    if (readingError) {
      console.error('Error inserting reading:', readingError)
      return new Response(JSON.stringify({ error: 'Failed to save reading' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // If fault detected, create maintenance and notify monitoradores
    if (fault_detected && device.pole_id) {
      // Map fault_type to failure_type enum
      const failureTypeMap: Record<string, string> = {
        'lampada_queimada': 'lampada_queimada',
        'curto_circuito': 'curto_circuito',
        'oscilacao': 'oscilacao',
        'fiacao_danificada': 'fiacao_danificada',
        'poste_danificado': 'poste_danificado',
      }
      const mappedFailureType = failureTypeMap[fault_type || ''] || 'outros'

      // Check if there's already an open maintenance for this pole
      const { data: existingMaintenance } = await supabase
        .from('maintenances')
        .select('id')
        .eq('pole_id', device.pole_id)
        .in('status', ['aberto', 'em_andamento'])
        .maybeSingle()

      if (!existingMaintenance) {
        // Create maintenance
        const { data: maintenance, error: maintError } = await supabase
          .from('maintenances')
          .insert({
            pole_id: device.pole_id,
            description: `Falha detectada automaticamente pelo dispositivo "${device.name}": ${fault_type || 'tipo não especificado'}`,
            failure_type: mappedFailureType,
            priority: 'alta',
            status: 'aberto',
          })
          .select('id')
          .single()

        if (maintError) {
          console.error('Error creating maintenance:', maintError)
        }

        // Update pole status
        await supabase
          .from('poles')
          .update({ status: 'com_falha' })
          .eq('id', device.pole_id)

        // Notify all monitoradores (sindico, subsindico, manutencao, admin)
        const { data: monitoradores } = await supabase
          .from('user_roles')
          .select('user_id')
          .in('role', ['admin', 'sindico', 'subsindico', 'manutencao'])

        if (monitoradores && maintenance) {
          const notifications = monitoradores.map(m => ({
            user_id: m.user_id,
            title: '⚡ Falha detectada automaticamente',
            message: `O dispositivo "${device.name}" detectou uma falha do tipo "${fault_type || 'desconhecido'}" no poste associado.`,
            type: 'alerta',
            related_pole_id: device.pole_id,
            related_maintenance_id: maintenance.id,
          }))

          const { error: notifError } = await supabase
            .from('notifications')
            .insert(notifications)

          if (notifError) {
            console.error('Error creating notifications:', notifError)
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
