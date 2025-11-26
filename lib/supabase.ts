import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fbgudsagagpeczxamljb.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZ3Vkc2FnYWdwZWN6eGFtbGpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUwOTk0NTEsImV4cCI6MjA3MDY3NTQ1MX0.tfDCJhFn6p9fnlmeT33QPmM8lqsuIMEeW37fdE9Hucw'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey)

export type Usuario = Database['public']['Tables']['usuarios']['Row']
export type Analise = Database['public']['Tables']['analises']['Row']
export type Documento = Database['public']['Tables']['documentos']['Row']
export type ReferenciaComercial = Database['public']['Tables']['referencias_comerciais']['Row']
