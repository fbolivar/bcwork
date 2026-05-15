'use client'

import { useState } from 'react'
import Link from 'next/link'
import { TrendingUp, ChevronRight } from 'lucide-react'

function fmt(n: number) {
  return `$${Math.round(n).toLocaleString('es-CO')}`
}

const WORKING_DAYS = 22
const WORKING_HOURS = 176 // hours/month standard Colombia

export function ROICalculator() {
  const [employees, setEmployees] = useState(20)
  const [salary, setSalary] = useState(3_000_000)
  const [minutesDay, setMinutesDay] = useState(15)

  // BCWork cost (Growth plan per-seat)
  const bcworkMonthlyCost = employees * 14900

  // Value of time recovered
  const hourlyRate = salary / WORKING_HOURS
  const hoursRecoveredPerEmployee = (minutesDay / 60) * WORKING_DAYS
  const valueRecovered = employees * hoursRecoveredPerEmployee * hourlyRate

  const roi = valueRecovered / bcworkMonthlyCost
  const netGain = valueRecovered - bcworkMonthlyCost

  const roiFormatted = roi.toFixed(1)
  const isGoodROI = roi >= 2

  return (
    <section className="bg-gradient-to-b from-[#0a1020] to-[#0f172a] px-6 py-24">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-cyan-400">
            Calculadora de ROI
          </p>
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            ¿Cuánto vale recuperar{' '}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
              15 minutos al día?
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-400">
            Con BCWork, empresas colombianas recuperan en promedio 15–25 min/empleado/día en tiempo
            productivo. Calcula el retorno para tu equipo:
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Sliders */}
          <div className="space-y-7 rounded-2xl border border-white/10 bg-white/5 p-6">
            {/* Employees */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">Número de empleados</label>
                <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-400">
                  {employees}
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={500}
                step={5}
                value={employees}
                onChange={(e) => setEmployees(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>5</span>
                <span>500</span>
              </div>
            </div>

            {/* Salary */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Salario promedio mensual (COP)
                </label>
                <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-400">
                  {fmt(salary)}
                </span>
              </div>
              <input
                type="range"
                min={1_160_000}
                max={15_000_000}
                step={200_000}
                value={salary}
                onChange={(e) => setSalary(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>$1.160.000</span>
                <span>$15.000.000</span>
              </div>
            </div>

            {/* Minutes */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">
                  Minutos recuperados por empleado/día
                </label>
                <span className="rounded-lg bg-cyan-500/10 px-3 py-1 text-sm font-bold text-cyan-400">
                  {minutesDay} min
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={60}
                step={5}
                value={minutesDay}
                onChange={(e) => setMinutesDay(Number(e.target.value))}
                className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-cyan-500"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-600">
                <span>5 min</span>
                <span>60 min</span>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              * Basado en {WORKING_DAYS} días laborables/mes y {WORKING_HOURS}h/mes estándar
              Colombia.
            </p>
          </div>

          {/* Results */}
          <div className="flex flex-col justify-between space-y-4">
            {/* Main ROI */}
            <div
              className={`rounded-2xl border p-6 text-center ${
                isGoodROI
                  ? 'border-cyan-500/40 bg-gradient-to-b from-cyan-500/10 to-transparent'
                  : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="mb-1 text-sm text-gray-400">Retorno sobre inversión</p>
              <div className="flex items-end justify-center gap-2">
                <span
                  className={`text-6xl font-extrabold ${isGoodROI ? 'text-cyan-400' : 'text-white'}`}
                >
                  {roiFormatted}x
                </span>
              </div>
              <p className="mt-2 text-sm text-gray-400">
                Por cada peso invertido en BCWork, recuperas{' '}
                <span className="font-semibold text-white">{roiFormatted} pesos</span> en
                productividad
              </p>
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                <p className="text-xs text-gray-500">Costo BCWork/mes</p>
                <p className="mt-1 text-lg font-bold text-white">{fmt(bcworkMonthlyCost)}</p>
                <p className="text-xs text-gray-600">Plan Growth</p>
              </div>
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center">
                <p className="text-xs text-gray-500">Valor recuperado/mes</p>
                <p className="mt-1 text-lg font-bold text-green-400">{fmt(valueRecovered)}</p>
                <p className="text-xs text-gray-600">
                  {minutesDay}min × {employees} empleados
                </p>
              </div>
              <div className="col-span-2 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-center">
                <p className="text-xs text-gray-400">Ganancia neta mensual</p>
                <p className="mt-1 text-2xl font-extrabold text-cyan-400">{fmt(netGain)}</p>
                <p className="text-xs text-gray-500">después de descontar el costo de BCWork</p>
              </div>
            </div>

            <Link
              href="/register"
              className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition-all hover:bg-cyan-400"
            >
              <TrendingUp className="h-4 w-4" />
              Empieza tu prueba gratis — 14 días
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
