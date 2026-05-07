'use client'

import { useState } from 'react'
import { trpc as api } from '@/lib/trpc-client'
import {
  Plus,
  ChevronRight,
  ChevronDown,
  Users,
  Briefcase,
  X,
  Mail,
  Phone,
  Link as LinkIcon,
  MapPin,
  DollarSign,
} from 'lucide-react'

const STAGES = [
  { id: 'applied', label: 'Aplicó', color: 'bg-gray-100 text-gray-600' },
  { id: 'screening', label: 'Screening', color: 'bg-blue-100 text-blue-700' },
  { id: 'interview', label: 'Entrevista', color: 'bg-purple-100 text-purple-700' },
  { id: 'technical', label: 'Prueba técnica', color: 'bg-amber-100 text-amber-700' },
  { id: 'offer', label: 'Oferta', color: 'bg-cyan-100 text-cyan-700' },
  { id: 'hired', label: 'Contratado', color: 'bg-green-100 text-green-700' },
  { id: 'rejected', label: 'Rechazado', color: 'bg-red-100 text-red-600' },
]

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
}
const PRIORITY_LABELS: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
}

function fmt(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n)
}

type JobForm = {
  id?: string
  title: string
  department: string
  description: string
  requirements: string
  seniority_level: string
  headcount: number
  priority: string
  status: string
  location_type: string
  salary_min: string
  salary_max: string
  due_date: string
  notes: string
}

const emptyJob = (): JobForm => ({
  title: '',
  department: '',
  description: '',
  requirements: '',
  seniority_level: 'mid',
  headcount: 1,
  priority: 'medium',
  status: 'open',
  location_type: 'remote',
  salary_min: '',
  salary_max: '',
  due_date: '',
  notes: '',
})

type CandidateForm = {
  id?: string
  hiring_request_id?: string
  full_name: string
  email: string
  phone: string
  cv_url: string
  linkedin_url: string
  source: string
  stage: string
  stage_notes: string
  expected_salary: string
  rejected_reason: string
}

const emptyCandidate = (hiring_request_id?: string): CandidateForm => ({
  hiring_request_id,
  full_name: '',
  email: '',
  phone: '',
  cv_url: '',
  linkedin_url: '',
  source: 'direct',
  stage: 'applied',
  stage_notes: '',
  expected_salary: '',
  rejected_reason: '',
})

export function RecruitmentPanel() {
  const utils = api.useUtils()
  const { data: jobs = [], isLoading } = api.admin.listHiringRequests.useQuery()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showJobForm, setShowJobForm] = useState(false)
  const [jobForm, setJobForm] = useState<JobForm>(emptyJob())
  const [showCandidateForm, setShowCandidateForm] = useState<string | null>(null)
  const [candidateForm, setCandidateForm] = useState<CandidateForm>(emptyCandidate())
  const [stageFilter, setStageFilter] = useState<string>('all')

  const { data: candidates = [] } = api.admin.listCandidates.useQuery(
    { hiring_request_id: expandedId ?? undefined },
    { enabled: !!expandedId },
  )

  const upsertJob = api.admin.upsertHiringRequest.useMutation({
    onSuccess: () => {
      void utils.admin.listHiringRequests.invalidate()
      setShowJobForm(false)
      setJobForm(emptyJob())
    },
  })
  const deleteJob = api.admin.deleteHiringRequest.useMutation({
    onSuccess: () => void utils.admin.listHiringRequests.invalidate(),
  })
  const upsertCandidate = api.admin.upsertCandidate.useMutation({
    onSuccess: () => {
      void utils.admin.listCandidates.invalidate()
      setShowCandidateForm(null)
      setCandidateForm(emptyCandidate())
    },
  })
  const updateStage = api.admin.updateCandidateStage.useMutation({
    onSuccess: () => void utils.admin.listCandidates.invalidate(),
  })
  const deleteCandidate = api.admin.deleteCandidate.useMutation({
    onSuccess: () => void utils.admin.listCandidates.invalidate(),
  })

  function editJob(job: any) {
    setJobForm({
      ...emptyJob(),
      ...job,
      salary_min: job.salary_min ?? '',
      salary_max: job.salary_max ?? '',
      due_date: job.due_date ?? '',
    })
    setShowJobForm(true)
  }

  const filteredCandidates =
    stageFilter === 'all'
      ? (candidates as any[])
      : (candidates as any[]).filter((c) => c.stage === stageFilter)

  if (isLoading) return <div className="h-64 animate-pulse rounded-xl bg-gray-100" />

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {(jobs as any[]).length} vacante{(jobs as any[]).length !== 1 ? 's' : ''}
        </p>
        <button
          type="button"
          onClick={() => {
            setJobForm(emptyJob())
            setShowJobForm(true)
          }}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva vacante
        </button>
      </div>

      {/* Job form */}
      {showJobForm && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-blue-900">
              {jobForm.id ? 'Editar vacante' : 'Nueva vacante'}
            </p>
            <button type="button" onClick={() => setShowJobForm(false)}>
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Título del cargo *</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.title}
                onChange={(e) => setJobForm({ ...jobForm, title: e.target.value })}
                placeholder="Desarrollador Full Stack"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Departamento</label>
              <input
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.department}
                onChange={(e) => setJobForm({ ...jobForm, department: e.target.value })}
                placeholder="Tecnología"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Modalidad</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.location_type}
                onChange={(e) => setJobForm({ ...jobForm, location_type: e.target.value })}
                title="Modalidad"
              >
                <option value="remote">Remoto</option>
                <option value="hybrid">Híbrido</option>
                <option value="onsite">Presencial</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Senioridad</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.seniority_level}
                onChange={(e) => setJobForm({ ...jobForm, seniority_level: e.target.value })}
                title="Senioridad"
              >
                <option value="junior">Junior</option>
                <option value="mid">Mid</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead</option>
                <option value="director">Director</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Prioridad</label>
              <select
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.priority}
                onChange={(e) => setJobForm({ ...jobForm, priority: e.target.value })}
                title="Prioridad"
              >
                <option value="low">Baja</option>
                <option value="medium">Media</option>
                <option value="high">Alta</option>
                <option value="urgent">Urgente</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Headcount</label>
              <input
                type="number"
                min={1}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.headcount}
                onChange={(e) => setJobForm({ ...jobForm, headcount: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Salario mínimo (COP)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.salary_min}
                onChange={(e) => setJobForm({ ...jobForm, salary_min: e.target.value })}
                placeholder="3000000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Salario máximo (COP)</label>
              <input
                type="number"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.salary_max}
                onChange={(e) => setJobForm({ ...jobForm, salary_max: e.target.value })}
                placeholder="6000000"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-600">Fecha límite</label>
              <input
                type="date"
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.due_date}
                onChange={(e) => setJobForm({ ...jobForm, due_date: e.target.value })}
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Descripción del cargo</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.description}
                onChange={(e) => setJobForm({ ...jobForm, description: e.target.value })}
                placeholder="Describe el cargo y responsabilidades..."
              />
            </div>
            <div className="col-span-2">
              <label className="mb-1 block text-xs text-gray-600">Requisitos</label>
              <textarea
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                value={jobForm.requirements}
                onChange={(e) => setJobForm({ ...jobForm, requirements: e.target.value })}
                placeholder="Requisitos y habilidades necesarias..."
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={!jobForm.title || upsertJob.isPending}
              onClick={() =>
                upsertJob.mutate({
                  ...jobForm,
                  id: jobForm.id,
                  headcount: Number(jobForm.headcount),
                  salary_min: jobForm.salary_min ? Number(jobForm.salary_min) : undefined,
                  salary_max: jobForm.salary_max ? Number(jobForm.salary_max) : undefined,
                  due_date: jobForm.due_date || undefined,
                  seniority_level: jobForm.seniority_level as any,
                  priority: jobForm.priority as any,
                  status: jobForm.status as any,
                  location_type: jobForm.location_type as any,
                })
              }
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {upsertJob.isPending ? 'Guardando...' : jobForm.id ? 'Actualizar' : 'Crear vacante'}
            </button>
            <button
              type="button"
              onClick={() => setShowJobForm(false)}
              className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {(jobs as any[]).length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-200 py-14 text-center">
          <Briefcase className="mx-auto mb-2 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Sin vacantes activas</p>
          <p className="text-xs text-gray-300">Crea tu primera vacante para comenzar a reclutar</p>
        </div>
      )}

      {/* Jobs list */}
      <div className="space-y-2">
        {(jobs as any[]).map((job) => {
          const isExpanded = expandedId === job.id
          const stageCounts = STAGES.map((s) => ({
            ...s,
            count: (candidates as any[]).filter((c) => c.stage === s.id).length,
          }))
          return (
            <div
              key={job.id}
              className="overflow-hidden rounded-xl border border-gray-100 bg-white"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : job.id)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">{job.title}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${PRIORITY_COLORS[job.priority] ?? ''}`}
                    >
                      {PRIORITY_LABELS[job.priority] ?? job.priority}
                    </span>
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    {job.department && (
                      <span className="flex items-center gap-0.5">
                        <Briefcase className="h-3 w-3" />
                        {job.department}
                      </span>
                    )}
                    <span className="flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {job.location_type}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Users className="h-3 w-3" />
                      {job.headcount} plaza{job.headcount !== 1 ? 's' : ''}
                    </span>
                    {job.salary_min && job.salary_max && (
                      <span className="flex items-center gap-0.5">
                        <DollarSign className="h-3 w-3" />
                        {fmt(job.salary_min)} – {fmt(job.salary_max)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editJob(job)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteJob.mutate({ id: job.id })}
                    className="rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-gray-50 px-4 py-4">
                  {/* Stage summary */}
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setStageFilter('all')}
                      className={`rounded-full px-3 py-0.5 text-xs font-medium ${stageFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'}`}
                    >
                      Todos ({(candidates as any[]).length})
                    </button>
                    {STAGES.map((s) => {
                      const count = (candidates as any[]).filter((c) => c.stage === s.id).length
                      if (count === 0) return null
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setStageFilter(s.id)}
                          className={`rounded-full px-3 py-0.5 text-xs font-medium ${stageFilter === s.id ? 'bg-gray-800 text-white' : s.color}`}
                        >
                          {s.label} ({count})
                        </button>
                      )
                    })}
                  </div>

                  {/* Candidate form */}
                  {showCandidateForm === job.id && (
                    <div className="mb-4 rounded-xl border border-green-100 bg-green-50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="text-sm font-semibold text-green-900">
                          {candidateForm.id ? 'Editar candidato' : 'Agregar candidato'}
                        </p>
                        <button type="button" onClick={() => setShowCandidateForm(null)}>
                          <X className="h-4 w-4 text-gray-400" />
                        </button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-gray-600">
                            Nombre completo *
                          </label>
                          <input
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.full_name}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, full_name: e.target.value })
                            }
                            placeholder="María García"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Email</label>
                          <input
                            type="email"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.email}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, email: e.target.value })
                            }
                            placeholder="candidato@email.com"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Teléfono</label>
                          <input
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.phone}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, phone: e.target.value })
                            }
                            placeholder="+57 300 000 0000"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">URL del CV</label>
                          <input
                            type="url"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.cv_url}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, cv_url: e.target.value })
                            }
                            placeholder="https://..."
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">LinkedIn</label>
                          <input
                            type="url"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.linkedin_url}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, linkedin_url: e.target.value })
                            }
                            placeholder="https://linkedin.com/in/..."
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Etapa</label>
                          <select
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.stage}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, stage: e.target.value })
                            }
                            title="Etapa"
                          >
                            {STAGES.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">
                            Salario esperado (COP)
                          </label>
                          <input
                            type="number"
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.expected_salary}
                            onChange={(e) =>
                              setCandidateForm({
                                ...candidateForm,
                                expected_salary: e.target.value,
                              })
                            }
                            placeholder="4000000"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs text-gray-600">Fuente</label>
                          <select
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.source}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, source: e.target.value })
                            }
                            title="Fuente"
                          >
                            <option value="direct">Directo</option>
                            <option value="linkedin">LinkedIn</option>
                            <option value="referral">Referido</option>
                            <option value="job_board">Bolsa de trabajo</option>
                            <option value="agency">Agencia</option>
                            <option value="other">Otro</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="mb-1 block text-xs text-gray-600">Notas</label>
                          <textarea
                            rows={2}
                            className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300"
                            value={candidateForm.stage_notes}
                            onChange={(e) =>
                              setCandidateForm({ ...candidateForm, stage_notes: e.target.value })
                            }
                            placeholder="Observaciones del candidato..."
                          />
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          disabled={!candidateForm.full_name || upsertCandidate.isPending}
                          onClick={() =>
                            upsertCandidate.mutate({
                              ...candidateForm,
                              id: candidateForm.id,
                              hiring_request_id: job.id,
                              expected_salary: candidateForm.expected_salary
                                ? Number(candidateForm.expected_salary)
                                : undefined,
                              stage: candidateForm.stage as any,
                            })
                          }
                          className="rounded-lg bg-green-600 px-4 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {upsertCandidate.isPending
                            ? 'Guardando...'
                            : candidateForm.id
                              ? 'Actualizar'
                              : 'Agregar candidato'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowCandidateForm(null)}
                          className="rounded-lg border border-gray-200 px-4 py-1.5 text-xs text-gray-600 hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add candidate button */}
                  {showCandidateForm !== job.id && (
                    <button
                      type="button"
                      onClick={() => {
                        setCandidateForm(emptyCandidate(job.id))
                        setShowCandidateForm(job.id)
                      }}
                      className="mb-3 flex items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-500 hover:bg-gray-50"
                    >
                      <Plus className="h-3.5 w-3.5" /> Agregar candidato
                    </button>
                  )}

                  {/* Candidates table */}
                  {filteredCandidates.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      Sin candidatos en esta etapa
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {filteredCandidates.map((c: any) => {
                        const stage = STAGES.find((s) => s.id === c.stage) ?? STAGES[0]!
                        return (
                          <div
                            key={c.id}
                            className="flex items-start gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold text-gray-800">{c.full_name}</p>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${stage.color}`}
                                >
                                  {stage.label}
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-400">
                                {c.email && (
                                  <span className="flex items-center gap-0.5">
                                    <Mail className="h-3 w-3" />
                                    {c.email}
                                  </span>
                                )}
                                {c.phone && (
                                  <span className="flex items-center gap-0.5">
                                    <Phone className="h-3 w-3" />
                                    {c.phone}
                                  </span>
                                )}
                                {c.cv_url && (
                                  <a
                                    href={c.cv_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-0.5 text-blue-500 hover:underline"
                                  >
                                    <LinkIcon className="h-3 w-3" />
                                    CV
                                  </a>
                                )}
                                {c.expected_salary && (
                                  <span className="flex items-center gap-0.5">
                                    <DollarSign className="h-3 w-3" />
                                    {fmt(c.expected_salary)}
                                  </span>
                                )}
                              </div>
                              {c.stage_notes && (
                                <p className="mt-1 text-xs text-gray-500">{c.stage_notes}</p>
                              )}
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <select
                                title="Cambiar etapa"
                                className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs focus:outline-none"
                                value={c.stage}
                                onChange={(e) =>
                                  updateStage.mutate({ id: c.id, stage: e.target.value as any })
                                }
                              >
                                {STAGES.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.label}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => deleteCandidate.mutate({ id: c.id })}
                                className="rounded-lg border border-red-100 px-2 py-1 text-xs text-red-500 hover:bg-red-50"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
