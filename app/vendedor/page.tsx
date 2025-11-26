'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'
import { Analise, Documento, ReferenciaComercial } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import DocumentoUpload from '@/components/DocumentoUpload'
import { Plus, FileText, Clock, CheckCircle, XCircle, AlertCircle, Eye, Download, Trash2 } from 'lucide-react'

interface AnaliseComDocumentos extends Analise {
  documentos?: Documento[]
  referencias_comerciais?: ReferenciaComercial[]
}

export default function VendedorDashboard() {
  const [analises, setAnalises] = useState<any[]>([])
  const [showNovaAnalise, setShowNovaAnalise] = useState(false)
  const [clienteNome, setClienteNome] = useState('')
  const [clienteCnpj, setClienteCnpj] = useState('')
  const [tipoCliente, setTipoCliente] = useState<'revenda' | 'construtora' | ''>('')
  const [codigoCliente, setCodigoCliente] = useState('')
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [analiseDetalhes, setAnaliseDetalhes] = useState<any | null>(null)
  const [tabAtiva, setTabAtiva] = useState<'checklist' | 'documentos'>('checklist')
  // Form de referências comerciais por análise
  const [refsForm, setRefsForm] = useState<Record<string, { empresa: string; contato: string; telefone: string }>>({})
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

  const reenviarAnalise = async (analiseId: string) => {
    try {
      const { error } = await supabase
        .from('analises')
        .update({ status: 'pendente', observacao_reanalise: null, atualizado_em: new Date().toISOString() })
        .eq('id', analiseId)

      if (error) throw error

      // Atualiza lista local
      setAnalises(prev => prev.map(a => a.id === analiseId ? { ...a, status: 'pendente', observacao_reanalise: null, atualizado_em: new Date().toISOString() } : a))
      if (analiseDetalhes?.id === analiseId) {
        setAnaliseDetalhes({ ...analiseDetalhes, status: 'pendente', observacao_reanalise: null, atualizado_em: new Date().toISOString() })
      }
      alert('Proposta reenviada para análise com sucesso!')
    } catch (error) {
      console.error('Erro ao reenviar proposta:', error)
      alert('Erro ao reenviar. Tente novamente.')
    }
  }

  const visualizarDocumento = async (documento: Documento) => {
    try {
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(documento.url, 300)
      if (error) throw error
      if (data?.signedUrl) window.open(data.signedUrl, '_blank')
    } catch (error) {
      console.error('Erro ao visualizar documento:', error)
      alert('Erro ao visualizar documento. Tente novamente.')
    }
  }

  const excluirDocumento = async (documento: Documento) => {
    if (!confirm(`Tem certeza que deseja excluir "${documento.nome_arquivo}"?`)) {
      return
    }

    try {
      // Remover do storage
      const { error: storageError } = await supabase.storage
        .from('documentos')
        .remove([documento.url])

      if (storageError) {
        console.error('Erro ao remover do storage:', storageError)
        // Continuar mesmo se falhar no storage
      }

      // Remover do banco de dados
      const { error: dbError } = await supabase
        .from('documentos')
        .delete()
        .eq('id', documento.id)

      if (dbError) throw dbError

      // Atualizar a lista
      await buscarAnalises()
      
      // Se estiver no modal de detalhes, atualizar também
      if (analiseDetalhes && analiseDetalhes.id === documento.analise_id) {
        setAnaliseDetalhes(prev => ({
          ...prev,
          documentos: prev.documentos.filter(d => d.id !== documento.id)
        }))
      }

      alert('Documento excluído com sucesso!')
    } catch (error) {
      console.error('Erro ao excluir documento:', error)
      alert('Erro ao excluir documento. Tente novamente.')
    }
  }

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

  // Máscara simples de CNPJ: 00.000.000/0000-00
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

  // Tipos de documento requeridos por tipo de cliente (mínimo 1 cada)
  const tiposRevenda = [
    { value: 'contrato_social', label: 'Contrato Social / Última Alteração' },
    { value: 'documento_socios', label: 'Documentos dos Sócios' },
    { value: 'notas_fiscais', label: 'Notas Fiscais (últ. 6 meses)' },
    { value: 'boletos_pagados', label: 'Boletos Pagos (últ. 6 meses)' },
    { value: 'selfie_responsavel', label: 'Selfie do Responsável' },
    { value: 'foto_fachada', label: 'Foto da Fachada' }
  ] as const

  const tiposConstrutora = [
    { value: 'contrato_social', label: 'Contrato Social / Última Alteração' },
    { value: 'documento_socios', label: 'Documentos dos Sócios' },
    { value: 'selfie_obra_ou_sede', label: 'Selfie na Obra/Sede (com placa, se possível)' },
    { value: 'fotos_obra', label: 'Fotos da Obra' },
    { value: 'notas_fiscais', label: 'Notas Fiscais (últ. 6 meses)' },
    { value: 'boletos_pagados', label: 'Boletos Pagos (últ. 6 meses)' }
  ] as const

  const getTiposByAnalise = (a: any) => {
    const tipo = a?.tipo_cliente as 'revenda' | 'construtora' | undefined
    return tipo === 'construtora' ? tiposConstrutora : tiposRevenda
  }

  const checklistStatus = (a: AnaliseComDocumentos) => {
    const tipos = getTiposByAnalise(a)
    const docs: Documento[] = a.documentos || []
    const byType = new Map<string, number>()
    docs.forEach(d => {
      const t = (d as any).tipo_documento || 'outro'
      byType.set(t, (byType.get(t) || 0) + 1)
    })
    const referencias = (a.referencias_comerciais || []).length
    const items = tipos.map(t => {
      let ok = (byType.get(t.value) || 0) >= 1
      // Regras específicas: para revenda e construtora, exigir 3 para notas e boletos
      if (t.value === 'notas_fiscais') ok = (byType.get('notas_fiscais') || 0) >= 3
      if (t.value === 'boletos_pagados') ok = (byType.get('boletos_pagados') || 0) >= 3
      return { key: t.value, label: t.label, ok }
    })
    // Item virtual para referências quando revenda
    const refsItem = a.tipo_cliente === 'revenda' ? [{ key: 'referencias_comerciais', label: 'Referências Comerciais (3 obrigatórias)', ok: referencias >= 3 }] : []
    const allItems = [...items, ...refsItem]
    const completo = allItems.every(i => i.ok)
    return { items: allItems, completo }
  }

  const addReferencia = async (analiseId: string) => {
    const form = refsForm[analiseId] || { empresa: '', contato: '', telefone: '' }
    if (!form.empresa.trim() || !form.contato.trim() || !form.telefone.trim()) {
      alert('Preencha empresa, contato e telefone da referência.')
      return
    }
    try {
      const analiseIdNum = Number(analiseId)
      const payload: Omit<ReferenciaComercial, 'id' | 'criado_em'> & { criado_em?: string } = {
        analise_id: isNaN(analiseIdNum) ? (analiseId as any) : (analiseIdNum as any),
        empresa: form.empresa.trim(),
        contato: form.contato.trim(),
        telefone: form.telefone.trim()
      }
      const { error } = await supabase.from('referencias_comerciais').insert(payload as any)
      if (error) throw error
      // Limpar form e recarregar
      setRefsForm(prev => ({ ...prev, [analiseId]: { empresa: '', contato: '', telefone: '' } }))
      await buscarAnalises()
    } catch (e) {
      console.error('Erro ao adicionar referência:', e)
      alert('Erro ao adicionar referência. Tente novamente.')
    }
  }

  const enviarProposta = async (analiseId: string) => {
    const analise = analises.find(a => a.id === analiseId)
    if (!analise) return
    const chk = checklistStatus(analise)
    if (!chk.completo) {
      alert('Checklist incompleto. Envie todos os documentos obrigatórios antes de enviar a proposta.')
      return
    }
    try {
      const { error } = await supabase
        .from('analises')
        .update({ status: 'pendente', atualizado_em: new Date().toISOString() })
        .eq('id', analiseId)
      if (error) throw error
      setAnalises(prev => prev.map(a => a.id === analiseId ? { ...a, status: 'pendente', atualizado_em: new Date().toISOString() } : a))
      if (analiseDetalhes?.id === analiseId) setAnaliseDetalhes({ ...analiseDetalhes, status: 'pendente', atualizado_em: new Date().toISOString() })
      alert('Proposta enviada com sucesso!')
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar proposta.')
    }
  }

  // Enviar proposta parcialmente mesmo com checklist incompleto
  const enviarPropostaParcial = async (analiseId: string) => {
    const analise = analises.find(a => a.id === analiseId)
    if (!analise) return
    const confirmar = window.confirm('Enviar parcialmente? O administrador será notificado e você poderá complementar depois.')
    if (!confirmar) return
    try {
      const { error } = await supabase
        .from('analises')
        .update({ status: 'pendente', atualizado_em: new Date().toISOString() })
        .eq('id', analiseId)
      if (error) throw error
      setAnalises(prev => prev.map(a => a.id === analiseId ? { ...a, status: 'pendente', atualizado_em: new Date().toISOString() } : a))
      if (analiseDetalhes?.id === analiseId) setAnaliseDetalhes({ ...analiseDetalhes, status: 'pendente', atualizado_em: new Date().toISOString() })
      alert('Proposta enviada parcialmente. Você pode continuar anexando documentos depois.')
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar proposta parcial.')
    }
  }

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
                    {creating ? 'Criando...' : 'Criar como Rascunho'}
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

                {/* Checklist e Documentos enviados */}
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
                
                {/* Checklist e Documentos enviados */}
                {analise.documentos && analise.documentos.length > 0 && (
                  <div className="mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Resumo</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 border rounded">
                        <div className="text-sm font-medium mb-2">Checklist</div>
                        <ul className="space-y-1">
                          {checklistStatus(analise).items.map(item => (
                            <li key={item.key} className="flex items-center text-sm">
                              {item.ok ? (
                                <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500 mr-2" />
                              )}
                              <span>{item.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-sm font-medium mb-2">Documentos ({analise.documentos.length})</div>
                        <div className="grid grid-cols-2 gap-2">
                          {analise.documentos.slice(0,6).map((doc: Documento) => (
                            <div key={doc.id} className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                              <FileText className="h-4 w-4" />
                              <span className="truncate">{doc.nome_arquivo}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Upload de documentos, referências e envio */}
                {(analise.status === 'rascunho' || analise.status === 'reanalise') && (
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">
                      {analise.status === 'reanalise' ? 'Enviar Documentos Adicionais da Proposta' : 'Enviar Documentos da Proposta'}
                    </h4>
                    {analise.status === 'reanalise' && analise.observacao_reanalise && (
                      <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded mb-3">
                        <div className="text-sm font-medium mb-1">Observação do Administrador</div>
                        <p className="text-sm whitespace-pre-wrap">{analise.observacao_reanalise}</p>
                      </div>
                    )}
                    <DocumentoUpload
                      analiseId={analise.id}
                      onUploadSuccess={buscarAnalises}
                      tipos={getTiposByAnalise(analise) as any}
                    />
                    {/* Contadores de Notas e Boletos (Revenda) */}
                    {(analise.tipo_cliente === 'revenda' || analise.tipo_cliente === 'construtora') && (
                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        {(() => {
                          const docs: Documento[] = analise.documentos || []
                          const countNotas = docs.filter((d: any) => d.tipo_documento === 'notas_fiscais').length
                          const countBoletos = docs.filter((d: any) => d.tipo_documento === 'boletos_pagados').length
                          return (
                            <>
                              <div className="p-3 border rounded bg-white">
                                <div className="font-medium">Notas Fiscais</div>
                                <div className={countNotas >= 3 ? 'text-green-700' : 'text-red-700'}>{countNotas}/3</div>
                              </div>
                              <div className="p-3 border rounded bg-white">
                                <div className="font-medium">Boletos Pagos</div>
                                <div className={countBoletos >= 3 ? 'text-green-700' : 'text-red-700'}>{countBoletos}/3</div>
                              </div>
                              {analise.tipo_cliente === 'revenda' && (
                                <div className="p-3 border rounded bg-white">
                                  <div className="font-medium">Referências Comerciais</div>
                                  <div className={(analise.referencias_comerciais?.length || 0) >= 3 ? 'text-green-700' : 'text-red-700'}>
                                    {(analise.referencias_comerciais?.length || 0)}/3
                                  </div>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    )}
                    {analise.tipo_cliente === 'revenda' && (
                      <div className="mt-4 p-3 border rounded-lg bg-white">
                        <div className="text-sm font-medium mb-2">Referências Comerciais (3 obrigatórias)</div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <input
                            type="text"
                            className="input-field w-full"
                            placeholder="Empresa"
                            value={refsForm[analise.id]?.empresa || ''}
                            onChange={(e) => setRefsForm(prev => ({ ...prev, [analise.id]: { ...(prev[analise.id]||{empresa:'',contato:'',telefone:''}), empresa: e.target.value } }))}
                          />
                          <input
                            type="text"
                            className="input-field w-full"
                            placeholder="Contato"
                            value={refsForm[analise.id]?.contato || ''}
                            onChange={(e) => setRefsForm(prev => ({ ...prev, [analise.id]: { ...(prev[analise.id]||{empresa:'',contato:'',telefone:''}), contato: e.target.value } }))}
                          />
                          <input
                            type="text"
                            className="input-field w-full"
                            placeholder="Telefone"
                            value={refsForm[analise.id]?.telefone || ''}
                            onChange={(e) => setRefsForm(prev => ({ ...prev, [analise.id]: { ...(prev[analise.id]||{empresa:'',contato:'',telefone:''}), telefone: e.target.value } }))}
                          />
                        </div>
                        <div className="mt-2">
                          <button className="btn-secondary" onClick={() => addReferencia(analise.id)}>
                            Adicionar Referência
                          </button>
                        </div>
                        <ul className="mt-3 space-y-1 text-sm text-gray-700">
                          {(analise.referencias_comerciais || []).map((ref: ReferenciaComercial) => (
                            <li key={ref.id} className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                              <span className="truncate">{ref.empresa} — {ref.contato} ({ref.telefone})</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm">
                        {checklistStatus(analise).completo ? (
                          <span className="text-green-700">Checklist completo. Pronto para enviar.</span>
                        ) : (
                          <span className="text-red-700">Checklist incompleto.</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => enviarPropostaParcial(analise.id)}
                          className="btn-secondary"
                        >
                          Enviar parcialmente
                        </button>
                        <button
                          onClick={() => enviarProposta(analise.id)}
                          disabled={!checklistStatus(analise).completo}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Enviar Proposta
                        </button>
                      </div>
                    </div>
                    {analise.status === 'reanalise' && (
                      <div className="mt-3">
                        <button
                          onClick={() => reenviarAnalise(analise.id)}
                          className="btn-primary"
                        >
                          Reenviar Proposta
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Ações */}
                <div className="mt-4 flex justify-end">
                  {analise.status === 'rascunho' && (
                    <button
                      onClick={async () => {
                        if (!confirm('Remover esta proposta (rascunho)? Esta ação não pode ser desfeita.')) return
                        try {
                          // remover documentos e referências antes para evitar FK
                          await supabase.from('documentos').delete().eq('analise_id', analise.id)
                          await supabase.from('referencias_comerciais').delete().eq('analise_id', analise.id)
                          const { error } = await supabase.from('analises').delete().eq('id', analise.id)
                          if (error) throw error
                          setAnalises(prev => prev.filter(a => a.id !== analise.id))
                          if (analiseDetalhes?.id === analise.id) setAnaliseDetalhes(null)
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
                    onClick={() => setAnaliseDetalhes(analise)}
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
      
      {/* Modal de detalhes */}
      {analiseDetalhes && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Proposta de {analiseDetalhes.cliente_nome}
                  </h2>
                  <p className="text-gray-600">CPF/CNPJ: {analiseDetalhes.cliente_cpf}</p>
                </div>
                <button onClick={() => setAnaliseDetalhes(null)} className="text-gray-400 hover:text-gray-600">
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              {/* Status atual */}
              <div className="mb-6">
                <div className="flex items-center space-x-2 mb-4">
                  {getStatusIcon(analiseDetalhes.status)}
                  <span className={getStatusBadgeClass(analiseDetalhes.status)}>
                    Status: {analiseDetalhes.status}
                  </span>
                </div>
                {analiseDetalhes.observacao_reanalise && (
                  <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded">
                    <div className="text-sm font-medium mb-1">Observação do Administrador</div>
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

              {/* Abas: Checklist | Documentos */}
              <div className="mb-6">
                <div className="tabs mb-4">
                  <button className={`tab ${tabAtiva === 'checklist' ? 'tab-active' : ''}`} onClick={() => setTabAtiva('checklist')}>Checklist</button>
                  <button className={`tab ${tabAtiva === 'documentos' ? 'tab-active' : ''}`} onClick={() => setTabAtiva('documentos')}>Documentos ({analiseDetalhes.documentos?.length || 0})</button>
                </div>

                {tabAtiva === 'checklist' ? (
                  <div>
                    <ul className="space-y-2">
                      {checklistStatus(analiseDetalhes).items.map((item: any) => (
                        <li key={item.key} className="flex items-center">
                          {item.ok ? (
                            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                          ) : (
                            <XCircle className="h-5 w-5 text-red-500 mr-2" />
                          )}
                          <span>{item.label}</span>
                        </li>
                      ))}
                    </ul>
                    {(analiseDetalhes.status === 'rascunho') && (
                      <div className="mt-4">
                        <button
                          onClick={() => enviarProposta(analiseDetalhes.id)}
                          disabled={!checklistStatus(analiseDetalhes).completo}
                          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Enviar Proposta
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    {analiseDetalhes.documentos && analiseDetalhes.documentos.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {analiseDetalhes.documentos.map((doc: Documento) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center space-x-2">
                              <FileText className="h-5 w-5 text-gray-500" />
                              <span className="text-sm font-medium">{doc.nome_arquivo}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <button onClick={() => visualizarDocumento(doc)} className="text-primary-600 hover:text-primary-800 flex items-center space-x-1">
                                <Download className="h-4 w-4" />
                                <span>Ver</span>
                              </button>
                              {/* Só permitir excluir se status for rascunho ou reanalise */}
                              {(analiseDetalhes.status === 'rascunho' || analiseDetalhes.status === 'reanalise') && (
                                <button 
                                  onClick={() => excluirDocumento(doc)} 
                                  className="text-red-600 hover:text-red-800 flex items-center space-x-1"
                                  title="Excluir documento"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500">Nenhum documento enviado ainda.</p>
                    )}
                  </div>
                )}
              </div>

              {/* Ações do vendedor no modal */}
              {analiseDetalhes.status === 'reanalise' && (
                <div className="border-t pt-6">
                  <button onClick={() => reenviarAnalise(analiseDetalhes.id)} className="btn-primary">
                    Reenviar Proposta
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
