'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProxyFrame, Pin } from './components/ProxyFrame'
import { PinList } from './components/PinList'
import { PreviewModal, PreviewResult } from './components/PreviewModal'

const FREQUENCY_OPTIONS = [
  { label: '15 minutos', value: 15 },
  { label: '30 minutos', value: 30 },
  { label: '1 hora', value: 60 },
  { label: '6 horas', value: 360 },
  { label: '24 horas', value: 1440 }
]

export default function NewMonitorPage () {
  const router = useRouter()
  const [name, setName] = useState('')
  const [frequency, setFrequency] = useState(60)
  const [pins, setPins] = useState<Pin[]>([])
  const [currentUrl, setCurrentUrl] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [previewResults, setPreviewResults] = useState<PreviewResult[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handlePinAdded = useCallback((pin: Pin) => {
    setPins(prev => [...prev, pin])
  }, [])

  const handleRemovePin = (index: number) => {
    setPins(prev => prev.filter((_, i) => i !== index))
  }

  const handlePreview = async () => {
    if (!currentUrl || pins.length === 0) return
    setShowModal(true)
    setPreviewLoading(true)
    setPreviewError(null)
    setPreviewResults([])
    try {
      const res = await fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: currentUrl, selectors: pins })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Error al previsualizar')
      }
      setPreviewResults(await res.json())
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setPreviewLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/monitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          url: currentUrl,
          selectors: previewResults.map(r => ({
            field: r.label,
            css: r.css,
            regex: r.regex
          })),
          frequencyMinutes: frequency
        })
      })

      if (res.ok) {
        router.push('/')
      } else {
        // Captura errores del servidor (400, 500, etc.)
        const errorData = await res.json().catch(() => ({}))
        console.error(
          'Error del servidor:',
          errorData.error || 'Error desconocido al guardar el monitor'
        )
        // Aquí deberías setear un estado de error para mostrárselo al usuario si tienes uno
        // setError(errorData.error || 'Ocurrió un error en el servidor');
      }
    } catch (error) {
      // Captura errores de red, fallos de conexión o código roto
      console.error('Error de red al crear el monitor:', error)
      // setError('Error de red. Revisa tu conexión a internet.');
    } finally {
      setSubmitting(false)
    }
  }

  const canPreview = pins.length > 0 && !!currentUrl

  return (
    <div className='flex flex-1 overflow-hidden'>
      {/* Left panel */}
      <div className='w-[380px] flex-shrink-0 flex flex-col border-r border-edge bg-surface overflow-y-auto'>
        <div className='p-6 space-y-5 flex-1'>
          <h1 className='text-xl font-bold text-ink'>Nuevo Monitor</h1>

          <div>
            <label className='block text-sm font-medium text-ink-muted mb-1'>
              Nombre (opcional)
            </label>
            <input
              type='text'
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='Mi monitor de precios'
              className='w-full border border-edge rounded-lg px-3 py-2 text-sm bg-surface text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-blue-400'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-ink-muted mb-1'>
              Frecuencia de monitoreo
            </label>
            <select
              value={frequency}
              onChange={e => setFrequency(Number(e.target.value))}
              className='w-full border border-edge rounded-lg px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-blue-400'
            >
              {FREQUENCY_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-ink-muted mb-2'>
              Campos detectados{pins.length > 0 && ` (${pins.length})`}
            </label>
            <PinList pins={pins} onRemove={handleRemovePin} />
          </div>
        </div>

        <div className='p-6 border-t border-edge'>
          <button
            onClick={handlePreview}
            disabled={!canPreview}
            className='w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors'
          >
            Previsualizar resultados
          </button>
          {!currentUrl && (
            <p className='text-xs text-ink-faint mt-2 text-center'>
              Carga una URL primero
            </p>
          )}
          {currentUrl && pins.length === 0 && (
            <p className='text-xs text-ink-faint mt-2 text-center'>
              Haz clic en elementos de la página
            </p>
          )}
        </div>
      </div>

      {/* Right panel */}
      <div className='flex-1 flex flex-col overflow-hidden'>
        <ProxyFrame onPinAdded={handlePinAdded} onUrlChange={setCurrentUrl} />
      </div>

      {showModal && (
        <PreviewModal
          results={previewResults}
          loading={previewLoading}
          error={previewError}
          onClose={() => setShowModal(false)}
          onConfirm={handleConfirm}
        />
      )}
    </div>
  )
}
