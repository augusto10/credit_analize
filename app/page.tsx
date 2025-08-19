'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authService } from '@/lib/auth'

export default function Home() {
  const router = useRouter()
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    if (isRedirecting) return // Evitar múltiplos redirecionamentos
    
    setIsRedirecting(true)
    
    const user = authService.getCurrentUser()
    
    if (user) {
      // Redirecionar baseado no tipo de usuário
      if (user.tipo_usuario === 'admin') {
        router.replace('/admin')
      } else {
        router.replace('/vendedor')
      }
    } else {
      // Redirecionar para login se não estiver logado
      router.replace('/login')
    }
  }, [router, isRedirecting])

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Carregando...</p>
      </div>
    </div>
  )
}
