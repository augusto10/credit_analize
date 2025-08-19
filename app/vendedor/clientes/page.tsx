"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { authService } from '@/lib/auth'

export default function ClientesVendedorPage() {
  const router = useRouter()
  const user = authService.getCurrentUser()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.tipo_usuario !== 'vendedor') {
      router.replace('/admin')
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Meus Clientes" />

      <div className="max-w-6xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Gerenciamento de Clientes</h1>
          <p className="text-gray-600 mb-4">Em breve: cadastro, edição e busca de clientes vinculados ao vendedor.</p>
          <div className="text-sm text-gray-500">Este é um esqueleto da página. Definiremos o modelo de dados de clientes antes de implementar.</div>
        </div>
      </div>
    </div>
  )
}
