import { supabase } from './supabase'
import { Usuario } from './supabase'

export interface AuthUser {
  id: string
  nome: string
  email: string
  tipo_usuario: 'vendedor' | 'admin'
}

export const authService = {
  async login(email: string, senha: string): Promise<AuthUser | null> {
    // Debug: log para verificar se está chegando aqui
    console.log('Tentando login com:', email, senha)
    
    try {
      // Usar API route para login seguro (evita problema de RLS)
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, senha })
      })

      const result = await response.json()
      console.log('Resultado API login:', result)

      if (!response.ok || result.error) {
        // Fallback temporário para usuários de teste
        if (email === 'vendedor@teste.com' && senha === '123456') {
          const testUser: AuthUser = {
            id: 'test-1',
            nome: 'João Vendedor',
            email: 'vendedor@teste.com',
            tipo_usuario: 'vendedor'
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(testUser))
          }
          return testUser
        }
        
        if (email === 'admin@teste.com' && senha === '123456') {
          const testUser: AuthUser = {
            id: 'test-2',
            nome: 'Maria Admin',
            email: 'admin@teste.com',
            tipo_usuario: 'admin'
          }
          if (typeof window !== 'undefined') {
            localStorage.setItem('user', JSON.stringify(testUser))
          }
          return testUser
        }
        
        return null
      }

      const user = result.user
      // Salvar no localStorage para manter sessão
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user))
      }

      return user
    } catch (error) {
      console.error('Erro no login:', error)
      return null
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
        const user: AuthUser = {
          id: parsed.id,
          nome: parsed.nome,
          email: parsed.email,
          tipo_usuario: parsed.tipo_usuario
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