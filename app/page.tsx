'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const GOLD = '#D4AF37'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
    const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
      async function handleLogin() {
    setLoading(true)
    setError('')
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError || !data.user) { setError('Error: ' + (authError?.message ?? 'desconocido')); setLoading(false); return }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single()
    if (!profile || !['admin', 'superadmin', 'operator', 'support'].includes(profile.role)) {
      await supabase.auth.signOut()
      setError('Sin acceso al panel admin')
      setLoading(false)
      return
    }
    router.replace('/admin/dashboard')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <p style={{ fontSize: '0.45rem', letterSpacing: '0.4em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: 8 }}>HWA CASINO</p>
          <h1 style={{ fontSize: '1.8rem', color: GOLD, fontWeight: 700, letterSpacing: '0.2em' }}>ADMIN PANEL</h1>
        </div>
        <div style={{ background: '#0d0d0d', border: '1px solid rgba(212,175,55,0.15)', borderRadius: 8, padding: 28 }}>
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', marginBottom: 6 }}>EMAIL</p>
            <input value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '10px 12px', color: '#fff', fontSize: '0.8rem', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.2em', marginBottom: 6 }}>CONTRASEÑA</p>
            <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '10px 12px', color: '#fff', fontSize: '0.8rem', outline: 'none', fontFamily: 'Montserrat, sans-serif' }} />
          </div>
          {error && <p style={{ color: '#f87171', fontSize: '0.65rem', marginBottom: 16 }}>{error}</p>}
          <button onPointerDown={handleLogin} disabled={loading}
            style={{ width: '100%', background: GOLD, border: 'none', borderRadius: 4, padding: '12px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3em', color: '#000', cursor: 'pointer', touchAction: 'manipulation', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'VERIFICANDO...' : 'INGRESAR'}
          </button>
        </div>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: '0.48rem', color: 'rgba(255,255,255,0.15)', letterSpacing: '0.2em' }}>
          ACCESO RESTRINGIDO · HWA CASINO
        </p>
      </div>
    </main>
  )
}





