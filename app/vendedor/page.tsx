'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'
import { Analise } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react'

interface AnaliseComDocumentos extends Analise {}

export default function VendedorDashboard() {
  const [analises, setAnalises] = useState<any[]>([])
  const [showNovaAnalise, setShowNovaAnalise] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCnpj, setClienteCnpj] = useState('')
  const [tipoCliente, setTipoCliente] = useState<'revenda' | 'construtora' | ''>('')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const router = useRouter()

  const user = authService.getCurrentUser()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.tipo_usuario !== 'vendedor') {
      router.replace('/admin')
      return
    }
    buscarAnalises()
  }, [])

  const buscarAnalises = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('analises')
        .select(`
          *,
          documentos (*),
          referencias_comerciais (*)
        `)
        .eq('vendedor_id', user.id)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setAnalises(data || [])
    } catch (error) {
      console.error('Erro ao buscar análises:', error)
      alert('Erro ao buscar propostas. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14)
    const parts = [
      digits.slice(0, 2),
      digits.slice(2, 5),
      digits.slice(5, 8),
      digits.slice(8, 12),
      digits.slice(12, 14)
    ]
    let out = ''
    if (parts[0]) out = parts[0]
    if (parts[1]) out += '.' + parts[1]
    if (parts[2]) out += '.' + parts[2]
    if (parts[3]) out += '/' + parts[3]
    if (parts[4]) out += '-' + parts[4]
    return out
  }

  const validarCNPJ = (masked: string) => masked.replace(/\D/g, '').length === 14

  const criarAnalise = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !clienteNome.trim() || !clienteCnpj.trim() || !tipoCliente || !codigoCliente.trim()) return
    if (!validarCNPJ(clienteCnpj)) {
      alert('CNPJ inválido.')
      return
    }

    setCreating(true)
    try {
      const { data, error } = await supabase
        .from('analises')
        .insert({
          vendedor_id: user.id,
          cliente_nome: clienteNome.trim(),
          cliente_cpf: clienteCnpj.replace(/\D/g, ''),
          tipo_cliente: tipoCliente,
          codigo_cliente: codigoCliente.trim(),
          status: 'rascunho'
        })
        .select()
        .single()

      if (error) throw error

      // Adicionar nova análise à lista
      setAnalises([{ ...data, documentos: [] }, ...analises])
      
      // Reset form
      setClienteNome('')
      setClienteCnpj('')
      setTipoCliente('')
      setCodigoCliente('')
      setShowNovaAnalise(false)
    } catch (error: any) {
      console.error('Erro ao criar análise:', error)
      alert(`Erro ao criar análise: ${error?.message || 'Tente novamente.'}`)
    } finally {
      setCreating(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'aprovado':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'reprovado':
        return <XCircle className="h-5 w-5 text-red-500" />
      case 'reanalise':
        return <AlertCircle className="h-5 w-5 text-orange-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'Em análise'
      case 'aprovado':
        return 'Aprovada'
      case 'reprovado':
        return 'Reprovada'
      case 'reanalise':
        return 'Reanálise'
      default:
        return status
    }
  }

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'badge badge-pendente'
      case 'aprovado':
        return 'badge badge-aprovado'
      case 'reprovado':
        return 'badge badge-reprovado'
      case 'reanalise':
        return 'badge badge-reanalise'
      default:
        return 'badge badge-default'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar title="Painel do Vendedor" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Painel do Vendedor" />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header com botão Nova Proposta */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Minhas Propostas</h1>
          <button
            onClick={() => setShowNovaAnalise(true)}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Nova Proposta</span>
          </button>
        </div>

        {/* Modal Nova Proposta */}
        {showNovaAnalise && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h2 className="text-xl font-bold mb-4">Nova Proposta</h2>
              
              <form onSubmit={criarAnalise} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome do Cliente
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field w-full"
                    placeholder="Nome completo do cliente"
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cliente</label>
                  <select
                    required
                    className="input-field w-full"
                    value={tipoCliente}
                    onChange={(e) => setTipoCliente(e.target.value as any)}
                  >
                    <option value="">Selecione...</option>
                    <option value="revenda">Revenda</option>
                    <option value="construtora">Construtora</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código do Cliente</label>
                  <input
                    type="text"
                    required
                    className="input-field w-full"
                    placeholder="Ex: 12345"
                    value={codigoCliente}
                    onChange={(e) => setCodigoCliente(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field w-full"
                    placeholder="00.000.000/0000-00"
                    value={clienteCnpj}
                    onChange={(e) => setClienteCnpj(formatCNPJ(e.target.value))}
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowNovaAnalise(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="btn-primary flex-1"
                  >
                    {creating ? 'Criando...' : 'Criar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Propostas */}
        {analises.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma proposta encontrada
            </h3>
            <p className="text-gray-600 mb-4">
              Comece enviando sua primeira proposta
            </p>
            <button
              onClick={() => setShowNovaAnalise(true)}
              className="btn-primary"
            >
              Enviar Primeira Proposta
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {analises.map((analise) => (
              <div key={analise.id} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {analise.cliente_nome}
                    </h3>
                    <p className="text-gray-600">CPF/CNPJ: {analise.cliente_cpf}</p>
                    <p className="text-sm text-gray-500">
                      Enviado em: {new Date(analise.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(analise.status)}
                    <span className={getStatusBadgeClass(analise.status)}>
                      {getStatusText(analise.status)}
                    </span>
                  </div>
                </div>

                {(analise.status === 'aprovado' || analise.status === 'reprovado') && (
                  <div className="mb-4 bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded">
                    {analise.status === 'aprovado' && (
                      <div className="text-sm mb-1">
                        <span className="font-medium">Valor aprovado: </span>
                        {typeof analise.valor_aprovado === 'number' ? analise.valor_aprovado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                      </div>
                    )}
                    {analise.comentario_analista && (
                      <div className="text-sm">
                        <span className="font-medium">Comentário do analista: </span>
                        <span className="whitespace-pre-wrap">{analise.comentario_analista}</span>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  {analise.status === 'rascunho' && (
                    <button
                      onClick={async () => {
                        if (!confirm('Remover esta proposta (rascunho)? Esta ação não pode ser desfeita.')) return
                        try {
                          await supabase.from('documentos').delete().eq('analise_id', analise.id)
                          await supabase.from('referencias_comerciais').delete().eq('analise_id', analise.id)
                          const { error } = await supabase.from('analises').delete().eq('id', analise.id)
                          if (error) throw error
                          setAnalises(prev => prev.filter(a => a.id !== analise.id))
                          alert('Proposta removida com sucesso.')
                        } catch (e) {
                          console.error('Erro ao remover proposta:', e)
                          alert('Não foi possível remover a proposta. Tente novamente.')
                        }
                      }}
                      className="text-red-600 hover:text-red-800 mr-4"
                    >
                      Remover Proposta
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/vendedor/${analise.id}`)}
                    className="text-primary-600 hover:text-primary-900 flex items-center space-x-1"
                  >
                    <Eye className="h-4 w-4" />
                    <span>Ver Proposta</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
