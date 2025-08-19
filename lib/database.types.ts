export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string
          nome: string
          email: string
          senha: string
          tipo_usuario: 'vendedor' | 'admin'
          criado_em: string
        }
        Insert: {
          id?: string
          nome: string
          email: string
          senha: string
          tipo_usuario: 'vendedor' | 'admin'
          criado_em?: string
        }
        Update: {
          id?: string
          nome?: string
          email?: string
          senha?: string
          tipo_usuario?: 'vendedor' | 'admin'
          criado_em?: string
        }
      }
      analises: {
        Row: {
          id: string
          vendedor_id: string
          cliente_nome: string
          cliente_cpf: string
          tipo_cliente: 'revenda' | 'construtora'
          codigo_cliente: string
          status: 'rascunho' | 'pendente' | 'aprovado' | 'reprovado' | 'reanalise'
          observacao_reanalise: string | null
          comentario_analista: string | null
          valor_aprovado: number | null
          criado_em: string
          atualizado_em: string
        }
        Insert: {
          id?: string
          vendedor_id: string
          cliente_nome: string
          cliente_cpf: string
          tipo_cliente: 'revenda' | 'construtora'
          codigo_cliente: string
          status?: 'rascunho' | 'pendente' | 'aprovado' | 'reprovado' | 'reanalise'
          observacao_reanalise?: string | null
          comentario_analista?: string | null
          valor_aprovado?: number | null
          criado_em?: string
          atualizado_em?: string
        }
        Update: {
          id?: string
          vendedor_id?: string
          cliente_nome?: string
          cliente_cpf?: string
          tipo_cliente?: 'revenda' | 'construtora'
          codigo_cliente?: string
          status?: 'rascunho' | 'pendente' | 'aprovado' | 'reprovado' | 'reanalise'
          observacao_reanalise?: string | null
          comentario_analista?: string | null
          valor_aprovado?: number | null
          criado_em?: string
          atualizado_em?: string
        }
      }
      documentos: {
        Row: {
          id: string
          analise_id: string
          nome_arquivo: string
          tipo_documento: string
          url: string
          criado_em: string
        }
        Insert: {
          id?: string
          analise_id: string
          nome_arquivo: string
          tipo_documento: string
          url: string
          criado_em?: string
        }
        Update: {
          id?: string
          analise_id?: string
          nome_arquivo?: string
          tipo_documento?: string
          url?: string
          criado_em?: string
        }
      }
      referencias_comerciais: {
        Row: {
          id: string
          analise_id: string
          empresa: string
          contato: string
          telefone: string
          criado_em: string
        }
        Insert: {
          id?: string
          analise_id: string
          empresa: string
          contato: string
          telefone: string
          criado_em?: string
        }
        Update: {
          id?: string
          analise_id?: string
          empresa?: string
          contato?: string
          telefone?: string
          criado_em?: string
        }
      }
    }
  }
}
