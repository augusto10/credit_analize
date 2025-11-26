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

    // Verificar se usuário já existe
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single()

    if (existingUser && !checkError) {
      return NextResponse.json({ error: 'Já existe um usuário com este email' }, { status: 400 })
    }

    // Inserir diretamente na tabela usuarios (sem Supabase Auth)
    const { data: newUser, error: insertErr } = await supabaseAdmin
      .from('usuarios')
      .insert({
        nome: nome.trim(),
        email: email.trim(),
        senha,
        tipo_usuario: (tipo_usuario === 'admin' ? 'admin' : 'vendedor') as any
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Erro ao inserir usuário:', insertErr)
      return NextResponse.json({ error: `Erro ao salvar usuário: ${insertErr.message}` }, { status: 400 })
    }

    console.log('Usuário criado com sucesso:', newUser.nome)
    return NextResponse.json({ id: newUser.id, email: newUser.email, nome: newUser.nome }, { status: 201 })
  } catch (e: any) {
    console.error('Erro API criar usuário:', e)
    return NextResponse.json({ error: e?.message || 'Erro interno' }, { status: 500 })
  }
}
