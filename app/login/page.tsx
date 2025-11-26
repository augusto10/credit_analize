'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'
import { Building2, Lock, Mail } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const user = await authService.login(email, senha)
      
      if (user) {
        // Redirecionar baseado no tipo de usuário
        if (user.tipo_usuario === 'admin') {
          router.push('/admin')
        } else {
          router.push('/vendedor')
        }
      } else {
        setError('Email ou senha incorretos')
      }
    } catch (err) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Thematic Image */}
      <div className="relative hidden lg:block">
        <img
          src="https://soliduz.com.br/wp-content/uploads/2019/03/analise_credito.jpg"
          alt="Ambiente interno corporativo"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-primary-700/80 via-primary-600/60 to-primary-400/40" />
        <div className="relative z-10 p-8 xl:p-10 h-full flex flex-col justify-between text-white">
          {/* logo removido conforme solicitado */}
          <div>
            <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight drop-shadow">
              Plataforma de análise de crédito Esplendor Atacadista
            </h2>
            <p className="mt-3 xl:mt-4 text-white/90 max-w-md">
              Uma plataforma de análise pensada para eficiência, transparência e agilidade.
            </p>
          </div>
          <div className="text-white/70 text-sm">© {new Date().getFullYear()} Esplendor Atacadista</div>
        </div>
      </div>

      {/* Right: Auth card */}
      <div className="flex items-center justify-center bg-surface-50 min-h-screen lg:min-h-0 py-10 lg:py-0">
        <div className="w-full max-w-md px-6 sm:px-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-gradient-to-br from-primary-600 to-primary-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <h1 className="mt-6 text-3xl font-bold text-surface-900">Sistema Esplendor</h1>
            <p className="mt-2 text-sm text-gray-600">Análise de Crédito</p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleLogin}>
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="input-field pl-10 w-full"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-gray-700">
                  Senha
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="senha"
                    name="senha"
                    type="password"
                    required
                    className="input-field pl-10 w-full"
                    placeholder="Sua senha"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex justify-center items-center"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  'Entrar'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
