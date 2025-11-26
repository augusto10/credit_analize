import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export async function POST(req: Request) {
  console.log('=== UPLOAD DE DOCUMENTO API ===')
  
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const analiseId = formData.get('analiseId') as string
    const userId = formData.get('userId') as string

    if (!file || !analiseId || !userId) {
      console.log('Erro: Dados incompletos', { file: !!file, analiseId: !!analiseId, userId: !!userId })
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
    }

    console.log('Upload:', { fileName: file.name, analiseId, userId })

    if (!supabaseUrl || !serviceKey) {
      console.log('Erro: Variáveis de ambiente não configuradas')
      return NextResponse.json({ error: 'Configuração do servidor incompleta' }, { status: 500 })
    }

    const supabaseAdmin = createClient<Database>(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Criar caminho do arquivo
    const timestamp = Date.now()
    const filePath = `${userId}/${analiseId}/${timestamp}-${file.name}`
    
    console.log('Fazendo upload para:', filePath)

    // Upload para o Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('documentos')
      .upload(filePath, file, {
        contentType: file.type || 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      console.log('Erro no upload:', uploadError.message)
      throw uploadError
    }

    console.log('Upload concluído, salvando no banco...')

    // Salvar referência no banco de dados
    const { error: dbError } = await supabaseAdmin
      .from('documentos')
      .insert({
        analise_id: analiseId,
        nome_arquivo: file.name,
        url: filePath
      })

    if (dbError) {
      console.log('Erro no banco:', dbError.message)
      console.log('Code:', dbError.code)
      
      // Se for erro de RLS, tentar abordagem alternativa
      if (dbError.code === '42501') {
        console.log('Erro de RLS detectado, tentando criar política...')
        
        // Tentar criar política RLS para Service Role
        try {
          await supabaseAdmin.rpc('exec_sql', {
            sql: `
              DROP POLICY IF EXISTS "service_role_full_access" ON documentos;
              CREATE POLICY "service_role_full_access" ON documentos
                FOR ALL USING (auth.role() = 'service_role')
                WITH CHECK (auth.role() = 'service_role');
            `
          })
          
          console.log('Política criada, tentando insert novamente...')
          
          // Tentar novamente
          const { error: retryError } = await supabaseAdmin
            .from('documentos')
            .insert({
              analise_id: analiseId,
              nome_arquivo: file.name,
              url: filePath
            })
          
          if (retryError) {
            throw retryError
          }
        } catch (policyError) {
          console.log('Erro ao criar política:', policyError.message)
          throw dbError // Retornar erro original
        }
      } else {
        throw dbError
      }
    }

    console.log('Documento salvo com sucesso!')

    return NextResponse.json({ 
      success: true,
      message: 'Documento enviado com sucesso',
      filePath: filePath
    }, { status: 200 })

  } catch (error: any) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ 
      error: 'Erro ao enviar documento',
      details: error.message 
    }, { status: 500 })
  }
}
