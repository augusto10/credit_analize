'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { authService } from '@/lib/auth'
import { Upload, FileText, CheckCircle } from 'lucide-react'

interface DocumentoUploadProps {
  analiseId: number | string
  tipos?: { value: string; label: string }[]
  onUploadSuccess?: () => void
}

export default function DocumentoUpload({ analiseId, onUploadSuccess, tipos }: DocumentoUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [tipoDocumento, setTipoDocumento] = useState<string>('')

  const uploadFile = async () => {
    if (!file) return
    if (tipos && !tipoDocumento) {
      alert('Selecione o tipo de documento.')
      return
    }

    const user = authService.getCurrentUser()
    if (!user) return
    if (!Number.isFinite(user.id)) {
      alert('Sessão inválida. Faça login novamente.')
      authService.clearCache()
      return
    }

    // Normalizar analiseId para número
    const analiseIdNum = typeof analiseId === 'number' ? analiseId : Number(analiseId)
    if (!Number.isFinite(analiseIdNum)) {
      console.error('analiseId inválido para upload:', analiseId)
      alert('Erro interno: ID da análise inválido.')
      return
    }

    setUploading(true)
    setSuccess(false)

    try {
      // Criar caminho do arquivo: vendedorId/analiseId/timestamp-nomeArquivo
      const timestamp = Date.now()
      const filePath = `${user.id}/${analiseIdNum}/${timestamp}-${file.name}`
      
      // Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('documentos')
        .upload(filePath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: true
        })

      if (uploadError) {
        throw uploadError
      }

      // Salvar referência no banco de dados
      const { error: dbError } = await supabase
        .from('documentos')
        .insert({
          analise_id: analiseIdNum,
          nome_arquivo: file.name,
          url: filePath, // Salvar apenas o caminho, não URL pública
          tipo_documento: tipoDocumento || 'outro'
        })

      if (dbError) {
        throw dbError
      }

      setSuccess(true)
      setFile(null)
      setTipoDocumento('')
      
      // Callback para atualizar lista de documentos
      if (onUploadSuccess) {
        onUploadSuccess()
      }

      // Reset success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)

    } catch (error: any) {
      console.error('Erro ao enviar documento:', error)
      const msg = error?.message || 'Erro ao enviar documento. Tente novamente.'
      alert(msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 bg-gray-50">
      <div className="text-center">
        {success ? (
          <div className="flex flex-col items-center text-green-600">
            <CheckCircle className="h-12 w-12 mb-2" />
            <p className="font-medium">Documento enviado com sucesso!</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <div className="space-y-4">
              {tipos && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Documento</label>
                  <select
                    className="input-field w-full"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                  >
                    <option value="">Selecione...</option>
                    {tipos.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                />
              </div>
              
              {file && (
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600">
                  <FileText className="h-4 w-4" />
                  <span>{file.name}</span>
                </div>
              )}

              <button
                onClick={uploadFile}
                disabled={!file || uploading || (Boolean(tipos) && !tipoDocumento)}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Enviando...</span>
                  </div>
                ) : (
                  'Enviar Documento'
                )}
              </button>
            </div>
          </>
        )}
      </div>
      
      <div className="mt-4 text-xs text-gray-500 text-center">
        Formatos aceitos: PDF, JPG, PNG, DOC, DOCX
      </div>
    </div>
  )
}
