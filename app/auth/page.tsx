'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

function AuthForm () {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login'
  )
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const t = searchParams.get('tab')
    if (t === 'register' || t === 'login') setTab(t)
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })

      if (result?.error) {
        setError('Credenciales incorrectas. Intenta de nuevo')
      } else {
        window.location.assign('/dashboard')
      }
    } catch (err) {
      console.error('Login error', err)
      setError('Error interno')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Error al registrarse.')
        return
      }
      // Auto sign-in after register
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false
      })
      console.log('signIn after register result', result)
      let sessionUserAfterRegister = null
      try {
        const sessionRes = await fetch('/api/auth/session')
        const sessionJson = await sessionRes.json()
        console.log('session after register signIn', sessionJson)
        sessionUserAfterRegister = sessionJson?.user ?? null
      } catch (e) {
        console.log('session fetch error after register', e)
      }

      if (sessionUserAfterRegister) {
        window.location.assign('/dashboard')
        return
      }

      if (result?.error) {
        setError('Registro exitoso. Inicia sesión.')
        setTab('login')
      } else {
        window.location.assign('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4'>
      {/* Logo */}
      <Link href='/' className='mb-8 flex items-center gap-2 text-white'>
        <span className='w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-sm font-bold'>
          Sc
        </span>
        <span className='font-semibold text-lg'>Scrapper</span>
      </Link>

      {/* Card */}
      <div className='w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden'>
        {/* Tabs */}
        <div className='flex border-b'>
          {(['login', 'register'] as const).map(t => (
            <button
              key={t}
              onClick={() => {
                setTab(t)
                setError('')
              }}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                tab === t
                  ? 'text-blue-600 border-b-2 border-blue-500 bg-white'
                  : 'text-gray-500 hover:text-gray-700 bg-gray-50'
              }`}
            >
              {t === 'login' ? 'Iniciar sesión' : 'Registrarse'}
            </button>
          ))}
        </div>

        {/* Form */}
        <form
          onSubmit={tab === 'login' ? handleLogin : handleRegister}
          className='p-8 space-y-4'
        >
          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Correo electrónico
            </label>
            <input
              type='email'
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder='tu@correo.com'
              className='w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
            />
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-700 mb-1'>
              Contraseña
            </label>
            <input
              type='password'
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder='Mínimo 6 caracteres'
              className='w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
            />
          </div>

          {tab === 'register' && (
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-1'>
                Confirmar contraseña
              </label>
              <input
                type='password'
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder='Repite tu contraseña'
                className='w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300'
              />
            </div>
          )}

          {error && (
            <p className='text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2'>
              {error}
            </p>
          )}

          <button
            type='submit'
            disabled={loading}
            className='w-full py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
          >
            {loading
              ? 'Cargando...'
              : tab === 'login'
              ? 'Entrar'
              : 'Crear cuenta'}
          </button>
        </form>

        {/* Footer */}
        <div className='px-8 pb-6 text-center'>
          <Link href='/' className='text-xs text-gray-400 hover:text-gray-600'>
            ← Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AuthPage () {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  )
}
