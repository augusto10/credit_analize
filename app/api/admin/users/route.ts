import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !serviceKey) {
  console.warn('Supabase service configuration missing. Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
}

const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

export async function POST(req: Request) {
  try {
    const { nome, email, senha, tipo_usuario } = await req.json()
    if (!nome?.trim() || !email?.trim() || !senha?.trim()) {
      return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    }

    // 1) Criar usuário no Auth
    const { data: authRes, error: authErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: { tipo_usuario }
    })
    if (authErr) {
      return NextResponse.json({ error: `Auth: ${authErr.message}` }, { status: 400 })
    }

    const user = authRes.user
    if (!user) {
      return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 })
    }

    // 2) Inserir na tabela usuarios (usar SERIAL id do banco e gravar senha para login local)
    const { error: insertErr } = await supabaseAdmin
      .from('usuarios')
      .insert({ nome, email, senha, tipo_usuario: (tipo_usuario === 'admin' ? 'admin' : 'vendedor') as any })

    if (insertErr) {
      return NextResponse.json({ error: `DB: ${insertErr.message}` }, { status: 400 })
    }

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (e: any) {
    console.error('Erro API criar usuário:', e)
    return NextResponse.json({ error: e?.message || 'Erro interno' }, { status: 500 })
  }
}
