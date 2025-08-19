import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://eqzxadypndbirhzeequy.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Analise = Database['public']['Tables']['analises']['Row']
export type Documento = Database['public']['Tables']['documentos']['Row']
export type ReferenciaComercial = Database['public']['Tables']['referencias_comerciais']['Row']
