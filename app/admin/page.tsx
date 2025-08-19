'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'
import { Analise, Documento } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Clock, 
  Filter,
  Eye,
  Download
} from 'lucide-react'

interface AnaliseComDocumentos extends Analise {
  documentos?: Documento[]
  vendedor?: { nome: string; email: string }
}

// Tipo temporário para contornar problemas de tipagem
type AnaliseTemp = {
  id: string
  vendedor_id: string
  cliente_nome: string
  cliente_cpf: string
  status: 'pendente' | 'aprovado' | 'reprovado' | 'reanalise'
  criado_em: string
  atualizado_em: string
  documentos?: Documento[]
  vendedor?: { nome: string; email: string }
}

export default function AdminDashboard() {
  const [analises, setAnalises] = useState<any[]>([])
  const [abaAtiva, setAbaAtiva] = useState<'analises' | 'usuarios'>('analises')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [loading, setLoading] = useState(true)
  const [analiseDetalhes, setAnaliseDetalhes] = useState<any | null>(null)
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [usuariosLoading, setUsuariosLoading] = useState(false)
  const [novoUsuario, setNovoUsuario] = useState({ nome: '', email: '', senha: '', tipo_usuario: 'vendedor' as 'vendedor' | 'admin' })
  const router = useRouter()

  const user = authService.getCurrentUser()

  useEffect(() => {
    if (!user) {
      router.replace('/login')
      return
    }
    if (user.tipo_usuario !== 'admin') {
      router.replace('/vendedor')
      return
    }
    
    buscarAnalises()
    buscarUsuarios()
  }, [])

  const buscarAnalises = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('analises')
        .select(`
          *,
          documentos (*),
          usuarios!analises_vendedor_id_fkey (nome, email)
        `)
        .order('criado_em', { ascending: false })

      if (error) throw error
      
      const analisesFormatadas = data?.map(item => ({
        ...item,
        vendedor: item.usuarios
      })) || []
      
      setAnalises(analisesFormatadas)
    } catch (error) {
      console.error('Erro ao buscar análises:', error)
    } finally {
      setLoading(false)
    }
  }

  const buscarUsuarios = async () => {
    setUsuariosLoading(true)
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('nome', { ascending: true })
      if (error) throw error
      setUsuarios(data || [])
    } catch (e) {
      console.error('Erro ao buscar usuários:', e)
    } finally {
      setUsuariosLoading(false)
    }
  }

  const baixarDocumento = async (documento: Documento) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(documento.url, 300)
      if (error) throw error
      const signedUrl = data?.signedUrl
      if (!signedUrl) return
      const resp = await fetch(signedUrl)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = documento.nome_arquivo || 'documento'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('Erro ao baixar documento:', e)
      alert('Erro ao baixar documento. Tente novamente.')
    }
  }

  const criarUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoUsuario.nome.trim() || !novoUsuario.email.trim() || !novoUsuario.senha.trim()) return
    try {
      const resp = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(novoUsuario)
      })
      if (!resp.ok) {
        const j = await resp.json().catch(() => ({}))
        throw new Error(j?.error || 'Falha ao criar usuário')
      }
      setNovoUsuario({ nome: '', email: '', senha: '', tipo_usuario: 'vendedor' })
      await buscarUsuarios()
      alert('Usuário criado com sucesso!')
    } catch (e: any) {
      console.error('Erro ao criar usuário:', e)
      alert(`Erro ao criar usuário: ${e?.message || 'Tente novamente.'}`)
    }
  }

  const mudarStatus = async (analiseId: string, novoStatus: string, observacao?: string, comentario?: string, valorAprovado?: number | null) => {
    try {
      const updatePayload: any = {
        status: novoStatus,
        atualizado_em: new Date().toISOString()
      }
      if (novoStatus === 'reanalise') {
        updatePayload.observacao_reanalise = observacao || null
      } else {
        updatePayload.observacao_reanalise = null
      }
      if (novoStatus === 'aprovado') {
        updatePayload.comentario_analista = comentario || null
        updatePayload.valor_aprovado = typeof valorAprovado === 'number' ? valorAprovado : null
      } else if (novoStatus === 'reprovado') {
        updatePayload.comentario_analista = comentario || null
        updatePayload.valor_aprovado = null
      }

      const { error } = await supabase
        .from('analises')
        .update(updatePayload)
        .eq('id', analiseId)

      if (error) throw error

      // Atualizar lista local
      setAnalises(analises.map(a => 
        a.id === analiseId 
          ? { ...a, status: novoStatus as any, atualizado_em: new Date().toISOString(), observacao_reanalise: updatePayload.observacao_reanalise, comentario_analista: updatePayload.comentario_analista, valor_aprovado: updatePayload.valor_aprovado }
          : a
      ))

      // Fechar modal de detalhes se estiver aberto
      if (analiseDetalhes?.id === analiseId) {
        setAnaliseDetalhes({
          ...analiseDetalhes,
          status: novoStatus as any,
          atualizado_em: new Date().toISOString(),
          observacao_reanalise: updatePayload.observacao_reanalise,
          comentario_analista: updatePayload.comentario_analista,
          valor_aprovado: updatePayload.valor_aprovado
        })
      }

    } catch (error) {
      console.error('Erro ao atualizar status:', error)
      alert('Erro ao atualizar status. Tente novamente.')
    }
  }

  const solicitarReanalise = async (analiseId: string) => {
    const obs = window.prompt('Informe a observação para o vendedor (o que está faltando):') || ''
    await mudarStatus(analiseId, 'reanalise', obs.trim() || '')
  }

  const aprovarAnalise = async (analiseId: string) => {
    const valorStr = window.prompt('Informe o valor aprovado (ex: 15000,50):') || ''
    const comentario = window.prompt('Comentário para o vendedor (visível após aprovação):') || ''
    const valor = Number(valorStr.replace(/\./g, '').replace(',', '.'))
    if (Number.isNaN(valor)) {
      alert('Valor inválido.')
      return
    }
    await mudarStatus(analiseId, 'aprovado', undefined, comentario.trim() || null as any, valor)
  }

  const reprovarAnalise = async (analiseId: string) => {
    const comentario = window.prompt('Motivo da reprovação (será exibido ao vendedor):') || ''
    await mudarStatus(analiseId, 'reprovado', undefined, comentario.trim() || '')
  }

  const visualizarDocumento = async (documento: Documento) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(documento.url, 300) // 5 minutos

      if (error) throw error

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (error) {
      console.error('Erro ao gerar URL do documento:', error)
      alert('Erro ao visualizar documento. Tente novamente.')
    }
  }

  // Baixar todos os documentos de uma análise em um único ZIP
  const baixarTodosDocumentos = async (analise: any) => {
    try {
      if (!analise?.documentos || analise.documentos.length === 0) {
        alert('Não há documentos para baixar.')
        return
      }

      const [{ default: JSZip }, { saveAs }] = await Promise.all([
        import('jszip'),
        import('file-saver')
      ])

      const zip = new JSZip()
      const sanitize = (s: string) => (s || 'SemNome')
        .replace(/[^a-zA-Z0-9_\- ]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

      const cliente = sanitize(analise.cliente_nome)
      const vendedor = sanitize(analise.vendedor?.nome || 'SemVendedor')
      const pastaNome = `${cliente} - ${vendedor}`
      const pasta = zip.folder(pastaNome)

      // Baixar arquivos em paralelo com limite leve
      const docs: Documento[] = analise.documentos
      for (const doc of docs) {
        try {
          const { data, error } = await supabase.storage
            .from('documentos')
            .createSignedUrl(doc.url, 300)
          if (error || !data?.signedUrl) throw error || new Error('URL assinada ausente')
          const resp = await fetch(data.signedUrl)
          if (!resp.ok) throw new Error('Falha no download')
          const blob = await resp.blob()
          const nomeArquivo = sanitize(doc.nome_arquivo || `documento_${doc.id}`)
          pasta?.file(nomeArquivo, blob)
        } catch (e) {
          console.error('Falha ao adicionar arquivo ao ZIP:', e)
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const zipNome = `${pastaNome}.zip`
      saveAs(zipBlob, zipNome)
    } catch (e) {
      console.error('Erro ao baixar todos documentos:', e)
      alert('Erro ao baixar todos os documentos. Tente novamente.')
    }
  }

  const analisesfiltradas = analises.filter(analise => {
    if (filtroStatus === 'todos') return true
    return analise.status === filtroStatus
  })

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return 'badge-pendente'
      case 'aprovado':
        return 'badge-aprovado'
      case 'reprovado':
        return 'badge-reprovado'
      case 'reanalise':
        return 'badge-reanalise'
      default:
        return 'badge-default'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar title="Painel Administrativo" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Painel Administrativo" />
      
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="tabs">
          <nav className="-mb-px flex space-x-2" aria-label="Tabs">
            <button
              className={`tab ${abaAtiva === 'analises' ? 'tab-active' : ''}`}
              onClick={() => setAbaAtiva('analises')}
            >
              Análises
            </button>
            <button
              className={`tab ${abaAtiva === 'usuarios' ? 'tab-active' : ''}`}
              onClick={() => setAbaAtiva('usuarios')}
            >
              Usuários
            </button>
          </nav>
        </div>

        {abaAtiva === 'analises' && (
          <>
            {/* Header com filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 space-y-4 sm:space-y-0">
              <h1 className="text-2xl font-bold text-gray-900">
                Análises de Crédito ({analisesfiltradas.length})
              </h1>
              
              <div className="flex items-center space-x-2">
                <Filter className="h-4 w-4 text-gray-500" />
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="todos">Todos os Status</option>
                  <option value="rascunho">Rascunho</option>
                  <option value="pendente">Pendente</option>
                  <option value="aprovado">Aprovado</option>
                  <option value="reprovado">Reprovado</option>
                  <option value="reanalise">Requer Documentos</option>
                </select>
              </div>
            </div>

        {/* Estatísticas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div className="ml-3">
                <p className="text-sm text-yellow-600">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {analises.filter(a => a.status === 'pendente').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-3">
                <p className="text-sm text-green-600">Aprovados</p>
                <p className="text-2xl font-bold text-green-900">
                  {analises.filter(a => a.status === 'aprovado').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <div className="flex items-center">
              <XCircle className="h-8 w-8 text-red-500" />
              <div className="ml-3">
                <p className="text-sm text-red-600">Reprovados</p>
                <p className="text-2xl font-bold text-red-900">
                  {analises.filter(a => a.status === 'reprovado').length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-orange-500" />
              <div className="ml-3">
                <p className="text-sm text-orange-600">Reanálise</p>
                <p className="text-2xl font-bold text-orange-900">
                  {analises.filter(a => a.status === 'reanalise').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de análises */}
        {analisesfiltradas.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Nenhuma análise encontrada
            </h3>
            <p className="text-gray-600">
              {filtroStatus === 'todos' 
                ? 'Não há análises cadastradas no sistema'
                : `Não há análises com status "${filtroStatus}"`
              }
            </p>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {analisesfiltradas.map((analise) => (
                <div key={analise.id} className="card">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-base font-semibold text-gray-900">{analise.cliente_nome}</div>
                      <div className="text-sm text-gray-500">{analise.cliente_cpf}</div>
                    </div>
                    <div className={`badge ${getStatusBadge(analise.status)}`}>{analise.status}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-500">Tipo/Código</div>
                      <div className="text-gray-900 capitalize">{analise.tipo_cliente || '—'}</div>
                      <div className="text-gray-500">{analise.codigo_cliente || '—'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500">Vendedor</div>
                      <div className="text-gray-900">{analise.vendedor?.nome || 'N/A'}</div>
                      <div className="text-gray-500">{analise.vendedor?.email || 'N/A'}</div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-sm text-gray-600">
                    <div>{analise.documentos?.length || 0} arquivo(s)</div>
                    <div>{new Date(analise.criado_em).toLocaleDateString('pt-BR')}</div>
                  </div>
                  <div className="mt-4">
                    <button onClick={() => setAnaliseDetalhes(analise)} className="btn-primary w-full flex items-center justify-center space-x-2">
                      <Eye className="h-4 w-4" />
                      <span>Ver detalhes</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="bg-white shadow-lg rounded-lg overflow-hidden hidden md:block">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tipo/Código
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Vendedor
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Documentos
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {analisesfiltradas.map((analise) => (
                      <tr key={analise.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{analise.cliente_nome}</div>
                            <div className="text-sm text-gray-500">{analise.cliente_cpf}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex flex-col">
                            <span className="capitalize">{analise.tipo_cliente || '—'}</span>
                            <span className="text-gray-500">{analise.codigo_cliente || '—'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{analise.vendedor?.nome || 'N/A'}</div>
                          <div className="text-sm text-gray-500">{analise.vendedor?.email || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(analise.status)}
                            <span className={`badge ${getStatusBadge(analise.status)}`}>{analise.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{analise.documentos?.length || 0} arquivo(s)</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(analise.criado_em).toLocaleDateString('pt-BR')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          <button onClick={() => setAnaliseDetalhes(analise)} className="text-primary-600 hover:text-primary-900 flex items-center space-x-1">
                            <Eye className="h-4 w-4" />
                            <span>Ver</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Modal de detalhes */}
        {analiseDetalhes && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Análise de {analiseDetalhes.cliente_nome}
                    </h2>
                    <p className="text-gray-600">CPF/CNPJ: {analiseDetalhes.cliente_cpf}</p>
                    <p className="text-gray-600">Tipo: <span className="capitalize">{analiseDetalhes.tipo_cliente || '—'}</span></p>
                    <p className="text-gray-600">Código do Cliente: {analiseDetalhes.codigo_cliente || '—'}</p>
                    <p className="text-sm text-gray-500">
                      Vendedor: {analiseDetalhes.vendedor?.nome}
                    </p>
                  </div>
                  
                  <button
                    onClick={() => setAnaliseDetalhes(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XCircle className="h-6 w-6" />
                  </button>
                </div>

                {/* Status atual */}
                <div className="mb-6">
                  <div className="flex items-center space-x-2 mb-4">
                    {getStatusIcon(analiseDetalhes.status)}
                    <span className={`badge ${getStatusBadge(analiseDetalhes.status)}`}>Status: {analiseDetalhes.status}</span>
                  </div>
                  {analiseDetalhes.observacao_reanalise && (
                    <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded">
                      <div className="text-sm font-medium mb-1">Observação para Reanálise</div>
                      <p className="text-sm whitespace-pre-wrap">{analiseDetalhes.observacao_reanalise}</p>
                    </div>
                  )}
                  {(analiseDetalhes.status === 'aprovado' || analiseDetalhes.status === 'reprovado') && (
                    <div className="mt-3 bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded">
                      {analiseDetalhes.status === 'aprovado' && (
                        <div className="text-sm mb-1">
                          <span className="font-medium">Valor aprovado: </span>
                          {typeof analiseDetalhes.valor_aprovado === 'number' ? analiseDetalhes.valor_aprovado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                        </div>
                      )}
                      {analiseDetalhes.comentario_analista && (
                        <div className="text-sm">
                          <span className="font-medium">Comentário do analista: </span>
                          <span className="whitespace-pre-wrap">{analiseDetalhes.comentario_analista}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Documentos */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold">
                      Documentos ({analiseDetalhes.documentos?.length || 0})
                    </h3>
                    <button
                      onClick={() => baixarTodosDocumentos(analiseDetalhes)}
                      className="text-primary-600 hover:text-primary-800 text-sm flex items-center space-x-1"
                    >
                      <Download className="h-4 w-4" />
                      <span>Baixar todos</span>
                    </button>
                  </div>
                  
                  {analiseDetalhes.documentos && analiseDetalhes.documentos.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {analiseDetalhes.documentos?.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex items-center space-x-2">
                            <FileText className="h-5 w-5 text-gray-500" />
                            <span className="text-sm font-medium">{doc.nome_arquivo}</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => visualizarDocumento(doc)}
                              className="text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                            >
                              <Eye className="h-4 w-4" />
                              <span>Ver</span>
                            </button>
                            <button
                              onClick={() => baixarDocumento(doc)}
                              className="text-primary-600 hover:text-primary-800 flex items-center space-x-1"
                            >
                              <Download className="h-4 w-4" />
                              <span>Baixar</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Nenhum documento enviado ainda.</p>
                  )}
                </div>

                {/* Ações */}
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Ações</h3>
                  <div className="flex flex-wrap gap-3">
                    <button
                      onClick={() => aprovarAnalise(analiseDetalhes.id)}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Aprovar</span>
                    </button>
                    
                    <button
                      onClick={() => reprovarAnalise(analiseDetalhes.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <XCircle className="h-4 w-4" />
                      <span>Reprovar</span>
                    </button>
                    
                    <button
                      onClick={() => solicitarReanalise(analiseDetalhes.id)}
                      className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>Solicitar Documentos</span>
                    </button>
                    
                    <button
                      onClick={() => mudarStatus(analiseDetalhes.id, 'pendente')}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                    >
                      <Clock className="h-4 w-4" />
                      <span>Marcar como Pendente</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

          </>
        )}

        {abaAtiva === 'usuarios' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Gerenciar Usuários</h2>
            </div>

            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="font-medium mb-3">Criar novo usuário</h3>
              <form onSubmit={criarUsuario} className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <input className="input-field" placeholder="Nome" value={novoUsuario.nome} onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })} />
                <input className="input-field" type="email" placeholder="Email" value={novoUsuario.email} onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })} />
                <input className="input-field" type="password" placeholder="Senha" value={novoUsuario.senha} onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })} />
                <select className="input-field" value={novoUsuario.tipo_usuario} onChange={(e) => setNovoUsuario({ ...novoUsuario, tipo_usuario: e.target.value as any })}>
                  <option value="vendedor">Vendedor</option>
                  <option value="admin">Admin</option>
                </select>
                <div className="md:col-span-4">
                  <button type="submit" className="btn-primary">Criar Usuário</button>
                </div>
              </form>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="p-4 border-b">
                <h3 className="font-medium">Usuários cadastrados</h3>
              </div>
              <div className="p-4">
                {usuariosLoading ? (
                  <div className="text-gray-500">Carregando...</div>
                ) : usuarios.length === 0 ? (
                  <div className="text-gray-500">Nenhum usuário encontrado.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {usuarios.map((u) => (
                          <tr key={u.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.nome}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{u.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">{u.tipo_usuario}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
