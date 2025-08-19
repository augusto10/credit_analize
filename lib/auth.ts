import { supabase } from './supabase'
import { Usuario } from './supabase'

export interface AuthUser {
  id: number
  nome: string
  email: string
  tipo_usuario: 'vendedor' | 'admin'
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthUser | null> {
    // Debug: log para verificar se está chegando aqui
    console.log('Tentando login com:', email, senha)
    
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .eq('senha', senha)
      .single()

    console.log('Resultado Supabase:', { data, error })

    if (error || !data) {
      // Fallback temporário para usuários de teste
      if (email === 'vendedor@teste.com' && senha === '123456') {
        const testUser = {
          id: 1,
          nome: 'João Vendedor',
          email: 'vendedor@teste.com',
          tipo_usuario: 'vendedor' as const
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(testUser))
        }
        return testUser
      }
      
      if (email === 'admin@teste.com' && senha === '123456') {
        const testUser = {
          id: 2,
          nome: 'Maria Admin',
          email: 'admin@teste.com',
          tipo_usuario: 'admin' as const
        }
        if (typeof window !== 'undefined') {
          localStorage.setItem('user', JSON.stringify(testUser))
        }
        return testUser
      }
      
      return null
    }

    // Salvar no localStorage para manter sessão
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify({
        id: data.id,
        nome: data.nome,
        email: data.email,
        tipo_usuario: data.tipo_usuario
      }))
    }

    return {
      id: data.id,
      nome: data.nome,
      email: data.email,
      tipo_usuario: data.tipo_usuario
    }
  },

  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('user')
      localStorage.clear() // Limpar todo o localStorage
    }
  },

  clearCache() {
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
      // Forçar reload da página
      window.location.reload()
    }
  },

  getCurrentUser(): AuthUser | null {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user')
      if (!userStr) return null
      try {
        const parsed = JSON.parse(userStr)
        // Normalizar id: aceitar string numérica e converter; rejeitar valores inválidos
        const coercedId = typeof parsed.id === 'number' ? parsed.id : Number(parsed.id)
        if (!Number.isFinite(coercedId)) {
          // Remover estado inválido para forçar re-login
          localStorage.removeItem('user')
          return null
        }
        const user: AuthUser = {
          id: coercedId,
          nome: parsed.nome,
          email: parsed.email,
          tipo_usuario: parsed.tipo_usuario
        }
        // Persistir versão saneada se necessário
        if (parsed.id !== coercedId) {
          localStorage.setItem('user', JSON.stringify(user))
        }
        return user
      } catch {
        // JSON inválido: limpar e retornar null
        localStorage.removeItem('user')
        return null
      }
    }
    return null
  },

  isAdmin(): boolean {
    const user = this.getCurrentUser()
    return user?.tipo_usuario === 'admin'
  },

  isVendedor(): boolean {
    const user = this.getCurrentUser()
    return user?.tipo_usuario === 'vendedor'
  }
}
