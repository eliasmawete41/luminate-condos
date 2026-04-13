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
    
    const supabase = createClient(urlSupabase, chaveServico, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verificar se o admin já existe
    const { data: usuariosExistentes } = await supabase.auth.admin.listUsers()
    const adminExiste = usuariosExistentes?.users?.some(u => u.email === 'admin@projetofimdecurso.com')

    if (adminExiste) {
      return new Response(JSON.stringify({ message: 'Admin já existe' }), {
        headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
      })
    }

    // Criar usuário admin
    const { data: novoUsuario, error: erroCriacao } = await supabase.auth.admin.createUser({
      email: 'admin@projetofimdecurso.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: { full_name: 'Administrador Principal' }
    })

    if (erroCriacao) throw erroCriacao

    // Definir papel de admin
    if (novoUsuario.user) {
      // Atualizar papel de 'morador' para 'admin'
      const { error: erroPapel } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', novoUsuario.user.id)

      if (erroPapel) {
        // Se atualização falhar, inserir
        await supabase.from('user_roles').insert({
          user_id: novoUsuario.user.id,
          role: 'admin'
        })
      }
    }

    return new Response(JSON.stringify({ message: 'Admin criado com sucesso' }), {
      headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
    })
  } catch (erro) {
    return new Response(JSON.stringify({ error: erro.message }), {
      status: 500,
      headers: { ...cabecalhosCors, 'Content-Type': 'application/json' },
    })
  }
})
