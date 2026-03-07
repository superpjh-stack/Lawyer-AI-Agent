"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save } from "lucide-react"
import { Button } from "@/components/ui/Button"

const caseTypes = [
  { value: "civil", label: "민사" },
  { value: "criminal", label: "형사" },
  { value: "family", label: "가사" },
  { value: "administrative", label: "행정" },
  { value: "commercial", label: "상사" },
  { value: "labor", label: "노동" },
  { value: "bankruptcy", label: "도산" },
]

const statusOptions = [
  { value: "active", label: "진행중" },
  { value: "pending", label: "보류" },
  { value: "consultation", label: "상담중" },
]

export default function NewCasePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [form, setForm] = useState({
    caseNumber: "",
    title: "",
    caseType: "civil",
    clientName: "",
    court: "",
    status: "active",
    description: "",
  })

  const update = (key: string) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "사건 등록에 실패했습니다")
      }

      router.push("/cases")
    } catch (err) {
      setError(err instanceof Error ? err.message : "오류가 발생했습니다")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <div className="mb-6">
        <Link
          href="/cases"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          사건 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">새 사건 등록</h1>
        <p className="text-slate-500 text-sm mt-1">새로운 사건 정보를 입력하세요</p>
      </div>

      {error && (
        <div className="mb-4 px-3 py-2.5 rounded-lg bg-red-50 border border-red-100 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              사건번호
            </label>
            <input
              type="text"
              value={form.caseNumber}
              onChange={update("caseNumber")}
              placeholder="예: 2026-민-001 (미입력시 자동생성)"
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              사건 유형 <span className="text-red-500">*</span>
            </label>
            <select
              value={form.caseType}
              onChange={update("caseType")}
              className="input-field"
            >
              {caseTypes.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            사건명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={update("title")}
            placeholder="예: 임금체불 사건"
            required
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              의뢰인명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.clientName}
              onChange={update("clientName")}
              placeholder="홍길동"
              required
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              담당 법원
            </label>
            <input
              type="text"
              value={form.court}
              onChange={update("court")}
              placeholder="서울중앙지방법원"
              className="input-field"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            상태
          </label>
          <select
            value={form.status}
            onChange={update("status")}
            className="input-field"
          >
            {statusOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            사건 개요
          </label>
          <textarea
            value={form.description}
            onChange={update("description")}
            placeholder="사건에 대한 간략한 설명을 입력하세요"
            rows={4}
            className="input-field resize-none"
          />
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" loading={loading}>
            <Save className="w-4 h-4" />
            사건 등록
          </Button>
          <Link href="/cases">
            <Button type="button" variant="secondary">
              취소
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}
