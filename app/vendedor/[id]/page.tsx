"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import DocumentoUpload from "@/components/DocumentoUpload"
import { supabase } from "@/lib/supabase"
import { authService } from "@/lib/auth"
import { Analise, Documento, ReferenciaComercial } from "@/lib/supabase"
import { CheckCircle, Clock, XCircle, AlertCircle, FileText } from "lucide-react"

interface PageProps {
  params: { id: string }
}

interface AnaliseComRel extends Analise {
  documentos?: Documento[]
  referencias_comerciais?: ReferenciaComercial[]
}

export default function VendedorAnaliseDetalhe({ params }: PageProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [analise, setAnalise] = useState<AnaliseComRel | null>(null)
  const [tabAtiva, setTabAtiva] = useState<"checklist" | "documentos">("checklist")
  const [refsForm, setRefsForm] = useState<{ empresa: string; contato: string; telefone: string }>({ empresa: "", contato: "", telefone: "" })

  const user = authService.getCurrentUser()

  useEffect(() => {
    if (!user) {
      router.replace("/login")
      return
    }
    if (user.tipo_usuario !== "vendedor") {
      router.replace("/admin")
      return
    }
    carregar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id])

  const carregar = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("analises")
        .select(`*, documentos (*), referencias_comerciais (*)`)
        .eq("id", params.id)
        .single()
      if (error) throw error
      if (data && data.vendedor_id !== user?.id) {
        router.replace("/vendedor")
        return
      }
      setAnalise(data as any)
    } catch (e) {
      console.error("Erro carregando proposta:", e)
      alert("Não foi possível carregar a proposta.")
    } finally {
      setLoading(false)
    }
  }

  const getTiposByAnalise = (a?: AnaliseComRel | null) => {
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
    const tipo = a?.tipo_cliente as 'revenda' | 'construtora' | undefined
    return tipo === 'construtora' ? tiposConstrutora : tiposRevenda
  }

  const checklist = useMemo(() => {
    if (!analise) return { items: [], completo: false, combinedNotasBoletos: 0 }
    const tipos = getTiposByAnalise(analise)
    const docs: Documento[] = analise.documentos || []
    const byType = new Map<string, number>()
    docs.forEach(d => {
      const t = (d as any).tipo_documento || 'outro'
      byType.set(t, (byType.get(t) || 0) + 1)
    })
    const combinedNotasBoletos = (byType.get('notas_fiscais') || 0) + (byType.get('boletos_pagados') || 0)
    const items = tipos.flatMap(t => {
      if (t.value === 'boletos_pagados') return []
      if (t.value === 'notas_fiscais') {
        const ok = combinedNotasBoletos >= 1 && combinedNotasBoletos <= 3
        return [{ key: 'notas_boletos', label: 'Notas Fiscais e/ou Boletos (1 a 3)', ok }]
      }
      const ok = (byType.get(t.value) || 0) >= 1
      return [{ key: t.value, label: t.label, ok }]
    })
    const completo = items.every(i => i.ok)
    return { items, completo, combinedNotasBoletos }
  }, [analise])

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

  const reenviarAnalise = async () => {
    if (!analise) return
    try {
      const { error } = await supabase
        .from('analises')
        .update({ status: 'pendente', observacao_reanalise: null, atualizado_em: new Date().toISOString() })
        .eq('id', analise.id as any)
      if (error) throw error
      await carregar()
      alert('Proposta reenviada para análise com sucesso!')
    } catch (e) {
      console.error('Erro ao reenviar proposta:', e)
      alert('Erro ao reenviar. Tente novamente.')
    }
  }

  const enviarProposta = async () => {
    if (!analise) return
    if (!checklist.completo) {
      alert('Checklist incompleto. Envie todos os documentos obrigatórios antes de enviar a proposta.')
      return
    }
    try {
      const { error } = await supabase
        .from('analises')
        .update({ status: 'pendente', atualizado_em: new Date().toISOString() })
        .eq('id', analise.id as any)
      if (error) throw error
      await carregar()
      alert('Proposta enviada com sucesso!')
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar proposta.')
    }
  }

  const enviarPropostaParcial = async () => {
    if (!analise) return
    const confirmar = window.confirm('Enviar parcialmente? O administrador será notificado e você poderá complementar depois.')
    if (!confirmar) return
    try {
      const { error } = await supabase
        .from('analises')
        .update({ status: 'pendente', atualizado_em: new Date().toISOString() })
        .eq('id', analise.id as any)
      if (error) throw error
      await carregar()
      alert('Proposta enviada parcialmente. Você pode continuar anexando documentos depois.')
    } catch (e) {
      console.error(e)
      alert('Erro ao enviar proposta parcial.')
    }
  }

  const addReferencia = async () => {
    if (!analise) return
    const form = refsForm
    if (!form.empresa.trim() || !form.contato.trim() || !form.telefone.trim()) {
      alert('Preencha empresa, contato e telefone da referência.')
      return
    }
    try {
      const { error } = await supabase.from('referencias_comerciais').insert({
        analise_id: analise.id as any,
        empresa: form.empresa.trim(),
        contato: form.contato.trim(),
        telefone: form.telefone.trim()
      } as any)
      if (error) throw error
      setRefsForm({ empresa: "", contato: "", telefone: "" })
      await carregar()
    } catch (e) {
      console.error('Erro ao adicionar referência:', e)
      alert('Erro ao adicionar referência. Tente novamente.')
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

  if (loading) {
    return (
      <div className="min-h-screen">
        <Navbar title="Proposta" />
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  if (!analise) {
    return (
      <div className="min-h-screen">
        <Navbar title="Proposta" />
        <div className="max-w-4xl mx-auto py-10 px-4">
          <p className="text-gray-700">Proposta não encontrada.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Proposta" />
      <div className="max-w-5xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button className="text-primary-600 hover:text-primary-900" onClick={() => router.push('/vendedor')}>{"<-"} Voltar</button>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Proposta de {analise.cliente_nome}</h2>
              <p className="text-gray-600">CPF/CNPJ: {analise.cliente_cpf}</p>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(analise.status)}
              <span className={`badge ${analise.status === 'pendente' ? 'badge-pendente' : analise.status === 'aprovado' ? 'badge-aprovado' : analise.status === 'reprovado' ? 'badge-reprovado' : analise.status === 'reanalise' ? 'badge-reanalise' : 'badge-default'}`}>
                {analise.status}
              </span>
            </div>
          </div>

          {analise.observacao_reanalise && (
            <div className="mb-6 bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded">
              <div className="text-sm font-medium mb-1">Observação do Administrador</div>
              <p className="text-sm whitespace-pre-wrap">{analise.observacao_reanalise}</p>
            </div>
          )}

          {(analise.status === 'aprovado' || analise.status === 'reprovado') && (
            <div className="mb-6 bg-gray-50 border border-gray-200 text-gray-800 p-3 rounded">
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

          <div className="mb-6">
            <div className="tabs mb-4">
              <button className={`tab ${tabAtiva === 'checklist' ? 'tab-active' : ''}`} onClick={() => setTabAtiva('checklist')}>Checklist</button>
              <button className={`tab ${tabAtiva === 'documentos' ? 'tab-active' : ''}`} onClick={() => setTabAtiva('documentos')}>Documentos ({analise.documentos?.length || 0})</button>
            </div>

            {tabAtiva === 'checklist' ? (
              <div>
                <ul className="space-y-2">
                  {checklist.items.map((item) => (
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
                <div className={`mt-4 text-sm ${checklist.completo ? 'text-green-700' : 'text-red-700'}`}>
                  {checklist.completo ? 'Checklist completo. Pronto para enviar.' : 'Checklist incompleto.'}
                </div>
              </div>
            ) : (
              <div>
                {analise.documentos && analise.documentos.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analise.documentos.map((doc) => (
                      <div key={doc.id} className="p-3 border rounded flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-sm text-gray-700">
                          <FileText className="h-4 w-4" />
                          <span className="truncate">{doc.nome_arquivo}</span>
                        </div>
                        <button className="text-primary-600 hover:text-primary-900 text-sm" onClick={() => visualizarDocumento(doc)}>Abrir</button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm">Nenhum documento enviado.</p>
                )}
              </div>
            )}
          </div>

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
              <DocumentoUpload analiseId={analise.id as any} onUploadSuccess={carregar} tipos={getTiposByAnalise(analise) as any} />

              {(analise.tipo_cliente === 'revenda' || analise.tipo_cliente === 'construtora') && (
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  {(() => {
                    const docs: Documento[] = analise.documentos || []
                    const countNotas = docs.filter((d: any) => d.tipo_documento === 'notas_fiscais').length
                    const countBoletos = docs.filter((d: any) => d.tipo_documento === 'boletos_pagados').length
                    const combined = countNotas + countBoletos
                    const withinRange = combined >= 1 && combined <= 3
                    return (
                      <>
                        <div className="p-3 border rounded bg-white">
                          <div className="font-medium">Notas Fiscais + Boletos</div>
                          <div className={withinRange ? 'text-green-700' : 'text-red-700'}>{combined} / 1-3</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {(analise.tipo_cliente === 'revenda' || analise.tipo_cliente === 'construtora') && (
                <div className="mt-4 p-3 border rounded-lg bg-white">
                  <div className="text-sm font-medium mb-2">Referências Comerciais (opcional)</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <input type="text" className="input-field w-full" placeholder="Empresa" value={refsForm.empresa} onChange={(e) => setRefsForm(prev => ({ ...prev, empresa: e.target.value }))} />
                    <input type="text" className="input-field w-full" placeholder="Contato" value={refsForm.contato} onChange={(e) => setRefsForm(prev => ({ ...prev, contato: e.target.value }))} />
                    <input type="text" className="input-field w-full" placeholder="Telefone" value={refsForm.telefone} onChange={(e) => setRefsForm(prev => ({ ...prev, telefone: e.target.value }))} />
                  </div>
                  <div className="mt-2">
                    <button className="btn-secondary" onClick={addReferencia}>Adicionar Referência</button>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-gray-700">
                    {(analise.referencias_comerciais || []).map((ref) => (
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
                  {checklist.completo ? (
                    <span className="text-green-700">Checklist completo. Pronto para enviar.</span>
                  ) : (
                    <span className="text-red-700">Checklist incompleto.</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={enviarPropostaParcial} className="btn-secondary">Enviar parcialmente</button>
                  <button onClick={enviarProposta} disabled={!checklist.completo} className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed">Enviar Proposta</button>
                </div>
              </div>

              {analise.status === 'reanalise' && (
                <div className="mt-3">
                  <button onClick={reenviarAnalise} className="btn-primary">Reenviar Proposta</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
