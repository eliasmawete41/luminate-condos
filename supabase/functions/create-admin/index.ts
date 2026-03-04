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
    
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Check if admin already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const adminExists = existingUsers?.users?.some(u => u.email === 'admin@projetofimdecurso.com')

    if (adminExists) {
      return new Response(JSON.stringify({ message: 'Admin already exists' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create admin user
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: 'admin@projetofimdecurso.com',
      password: 'admin123',
      email_confirm: true,
      user_metadata: { full_name: 'Administrador Principal' }
    })

    if (createError) throw createError

    // Set admin role
    if (newUser.user) {
      // Update role from default 'morador' to 'admin'
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: 'admin' })
        .eq('user_id', newUser.user.id)

      if (roleError) {
        // If update fails, insert
        await supabase.from('user_roles').insert({
          user_id: newUser.user.id,
          role: 'admin'
        })
      }
    }

    return new Response(JSON.stringify({ message: 'Admin created successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
