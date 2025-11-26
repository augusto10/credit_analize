import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

export async function POST(req: Request) {
  console.log('=== API LOGIN CHAMADA ===')
  
  try {
    const { email, senha } = await req.json()
    console.log('Recebido:', { email, senha: senha ? '***' : 'null' })
    
    if (!email?.trim() || !senha?.trim()) {
      console.log('Erro: Email ou senha vazios')
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    // Tentar obter variáveis de ambiente
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    console.log('Variáveis de ambiente:')
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'OK' : 'MISSING')
    console.log('SUPABASE_SERVICE_ROLE_KEY:', serviceKey ? 'OK' : 'MISSING')

    if (!supabaseUrl || !serviceKey) {
      console.log('Erro: Variáveis de ambiente não configuradas')
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    console.log('Buscando usuário no banco...')

    // Buscar usuário no banco usando Service Role (evita problema de RLS)
    const { data: user, error } = await supabaseAdmin
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('senha', senha)
      .single()

    console.log('Resultado da consulta:', { user: user ? 'OK' : null, error: error?.message })

    if (error || !user) {
      console.log('Usuário não encontrado ou senha incorreta')
      return NextResponse.json({ error: 'Email ou senha incorretos' }, { status: 401 })
    }

    console.log('Usuário autenticado:', user.nome)

    // Retornar dados do usuário (sem a senha)
    const userData = {
      id: user.id,
      nome: user.nome,
      email: user.email,
      tipo_usuario: user.tipo_usuario
    }

    console.log('Retornando dados do usuário')
    return NextResponse.json({ user: userData }, { status: 200 })

  } catch (error: any) {
    console.error('Erro na API de login:', error)
    return NextResponse.json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    }, { status: 500 })
  }
}
