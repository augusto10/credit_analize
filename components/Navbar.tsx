'use client'

import { authService } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'

type NavbarProps = {
  title?: string
}

export default function Navbar({ title }: NavbarProps) {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [mounted, setMounted] = useState(false)
  // Usar URL externa confiável como padrão. A imagem atual no site é branca; manteremos, mas garantiremos visibilidade em todas as telas.
  const [logoSrc, setLogoSrc] = useState('https://www.esplendoratacadista.com.br/wp-content/uploads/2023/02/Esplendor-logo-branca.png')

  useEffect(() => {
    setMounted(true)
    setUser(authService.getCurrentUser())
  }, [])

  const handleLogout = () => {
    authService.logout()
    router.push('/login')
  }

  const Brand = (
    <div className="flex items-center space-x-3">
      <img
        src={logoSrc}
        alt="Esplendor"
        className="h-8 w-auto drop-shadow"
        onError={() => setLogoSrc('/favicon.ico')}
      />
      <div className="flex flex-col">
        <span className="text-lg font-bold text-surface-900 tracking-tight">
          {title || 'Sistema de Análise de Crédito'}
        </span>
        <span className="text-xs text-gray-500 hidden sm:block">Esplendor Atacadista</span>
      </div>
    </div>
  )

  if (!mounted) {
    return (
      <nav className="border-b bg-white/80 backdrop-blur">
        <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-400" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            {Brand}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <User className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-500">—</span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">—</span>
              </div>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur">
      <div className="h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-400" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {Brand}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-500" />
              <span className="text-sm text-gray-700">{user?.nome}</span>
              <span className="text-xs text-gray-700 bg-primary-100 px-2 py-1 rounded border border-primary-200 capitalize">
                {user?.tipo_usuario}
              </span>
            </div>
            <button
              onClick={() => router.push('/senha')}
              className="flex items-center space-x-1 text-gray-500 hover:text-surface-900 transition-colors text-sm"
            >
              <span>Trocar senha</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 text-gray-500 hover:text-surface-900 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              <span className="text-sm">Sair</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  )
}
