"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Navbar from "@/components/Navbar"
import { authService } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

export default function TrocarSenhaPage() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [current, setCurrent] = useState("")
  const [nextPwd, setNextPwd] = useState("")
  const [confirmPwd, setConfirmPwd] = useState("")

  const user = authService.getCurrentUser()

  useEffect(() => {
    setMounted(true)
    if (!user) {
      router.replace("/login")
      return
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    if (!current.trim() || !nextPwd.trim() || !confirmPwd.trim()) {
      alert("Preencha todos os campos.")
      return
    }
    if (nextPwd.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (nextPwd !== confirmPwd) {
      alert("As senhas não conferem.")
      return
    }

    setLoading(true)
    try {
      // Verifica senha atual e atualiza em uma única operação de segurança básica
      const { data, error } = await supabase
        .from("usuarios")
        .update({ senha: nextPwd })
        .eq("id", user.id as any)
        .eq("senha", current)
        .select("id")

      if (error) throw error
      if (!data || data.length === 0) {
        alert("Senha atual incorreta.")
        return
      }

      alert("Senha atualizada com sucesso! Faça login novamente.")
      authService.logout()
      router.replace("/login")
    } catch (err) {
      console.error("Erro ao atualizar senha:", err)
      alert("Não foi possível atualizar a senha. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar title="Trocar Senha" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Trocar Senha" />
      <div className="max-w-md mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h1 className="text-xl font-semibold mb-4">Alterar senha</h1>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Senha atual</label>
              <input
                type="password"
                className="input-field w-full"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nova senha</label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={nextPwd}
                  onChange={(e) => setNextPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Confirmar nova senha</label>
                <input
                  type="password"
                  className="input-field w-full"
                  value={confirmPwd}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                  autoComplete="new-password"
                />
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? "Salvando..." : "Salvar"}
              </button>
              <button type="button" className="btn-secondary" onClick={() => router.back()}>
                Voltar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
