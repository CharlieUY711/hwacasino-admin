'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const GOLD = '#D4AF37'
const DARK = '#0A0A0A'
const PANEL = '#0d0d0d'
const BORDER = 'rgba(212,175,55,0.12)'

type Section = 'overview' | 'users' | 'codes' | 'wallets' | 'games' | 'deposits' | 'bonuses' | 'config'

const NAV = [
  { id: 'overview',  label: 'Overview',    icon: '◈' },
  { id: 'users',     label: 'Usuarios',    icon: '◎' },
  { id: 'codes',     label: 'Códigos VIP', icon: '⬡' },
  { id: 'wallets',   label: 'Wallets',     icon: '♦' },
  { id: 'games',     label: 'Juegos',      icon: '♠' },
  { id: 'deposits',  label: 'Depósitos',   icon: '▲' },
  { id: 'bonuses',   label: 'Bonos',       icon: '♛' },
  { id: 'config',    label: 'Config',      icon: '⚙' },
]

export default function AdminDashboard() {
  const router = useRouter()
  const [section, setSection] = useState('overview')
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [stats, setStats] = useState<any>(null)
  const [users, setUsers] = useState<any[]>([])
  const [codes, setCodes] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [rounds, setRounds] = useState<any[]>([])
  const [deposits, setDeposits] = useState<any[]>([])
  const [withdrawals, setWithdrawals] = useState<any[]>([])
  const [bonuses, setBonuses] = useState<any[]>([])
  const [houseConfig, setHouseConfig] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [newCode, setNewCode] = useState({ code: '', max_uses: 1, bonus_chips: 0, expires_at: '' })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace('/'); return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single()
      if (!profile || !['admin', 'superadmin', 'operator', 'support'].includes(profile.role)) {
        router.replace('/'); return
      }
      setAuthorized(true)
      setLoading(false)
    }
    checkAuth()
  }, [router])

  const loadSection = useCallback(async (s: string) => {
    switch (s) {
      case 'overview': {
        const [{ count: totalUsers }, { count: totalDeposits }, { data: txData }, { data: roundData }] = await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }),
          supabase.from('deposit_requests').select('*', { count: 'exact', head: true }),
          supabase.from('wallet_transactions').select('amount, type').limit(500),
          supabase.from('game_rounds').select('id').limit(500),
        ])
        const totalVolume = (txData ?? []).filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount ?? 0), 0)
        setStats({ totalUsers, totalDeposits, totalVolume, totalRounds: roundData?.length ?? 0 })
        break
      }
      case 'users': {
        const { data } = await supabase.from('admin_users_view').select('*').order('created_at', { ascending: false }).limit(100)
        setUsers(data ?? [])
        break
      }
      case 'codes': {
        const { data } = await supabase.from('invites').select('*').order('created_at', { ascending: false })
        setCodes(data ?? [])
        break
      }
      case 'wallets': {
        const { data } = await supabase.from('wallet_transactions').select('*').order('created_at', { ascending: false }).limit(100)
        setTransactions(data ?? [])
        break
      }
      case 'games': {
        const { data } = await supabase.from('game_rounds').select('*').order('created_at', { ascending: false }).limit(100)
        setRounds(data ?? [])
        break
      }
      case 'deposits': {
        const [{ data: dep }, { data: with_ }] = await Promise.all([
          supabase.from('deposit_requests').select('*, profiles(username)').order('created_at', { ascending: false }).limit(50),
          supabase.from('withdraw_requests').select('*, profiles(username)').order('created_at', { ascending: false }).limit(50),
        ])
        setDeposits(dep ?? [])
        setWithdrawals(with_ ?? [])
        break
      }
      case 'bonuses': {
        const { data } = await supabase.from('user_bonuses').select('*, profiles(username)').order('created_at', { ascending: false }).limit(100)
        setBonuses(data ?? [])
        break
      }
      case 'config': {
        const { data } = await supabase.from('house_config').select('*')
        setHouseConfig(data ?? [])
        break
      }
    }
  }, [])

  useEffect(() => {
    if (authorized) loadSection(section)
  }, [authorized, section, loadSection])

  async function createCode() {
    if (!newCode.code.trim()) return
    setSaving(true)
    const { error } = await supabase.from('invites').insert({
      code: newCode.code.trim().toUpperCase(),
      max_uses: newCode.max_uses,
      bonus_chips: newCode.bonus_chips,
      used_count: 0,
      used: false,
      expires_at: newCode.expires_at || null,
    })
    setSaving(false)
    if (error) { setMsg('Error: ' + error.message); return }
    setMsg('✅ Código creado')
    setNewCode({ code: '', max_uses: 1, bonus_chips: 0, expires_at: '' })
    loadSection('codes')
    setTimeout(() => setMsg(''), 3000)
  }

  async function updateUserRole(userId: string, role: string) {
    await supabase.from('profiles').update({ role }).eq('id', userId)
    loadSection('users')
  }

  async function adjustBalance(userId: string, amount: number, type: string) {
    const { data: wallet } = await supabase.from('wallets').select('balances').eq('user_id', userId).single()
    if (!wallet) { setMsg('Error: wallet no encontrado'); return }
    const balances = wallet.balances ?? { CHIPS: 0 }
    const newChips = Math.max(0, (balances.CHIPS ?? 0) + (type === 'credit' ? amount : -amount))
    await supabase.from('wallets').update({ balances: { ...balances, CHIPS: newChips } }).eq('user_id', userId)
    const { data: walletRow } = await supabase.from('wallets').select('id').eq('user_id', userId).single()
    await supabase.from('wallet_transactions').insert({
      user_id: userId,
      wallet_id: walletRow?.id,
      type,
      amount,
      currency: 'CHIPS',
      balance_before: (balances.CHIPS ?? 0),
      balance_after: newChips,
      metadata: { reason: 'admin_adjustment' },
      status: 'completed'
    })
    setMsg('✅ Balance ajustado — ' + (type === 'credit' ? '+' : '-') + amount + ' CHIPS')
    setTimeout(() => setMsg(''), 3000)
    loadSection('users')
  }

  async function approveDeposit(id: string, userId: string, amount: number) {
    await supabase.from('deposit_requests').update({ status: 'approved' }).eq('id', id)
    const { data: wallet } = await supabase.from('wallets').select('balances').eq('user_id', userId).single()
    const balances = wallet?.balances ?? { CHIPS: 0, USD: 0 }
    await supabase.from('wallets').update({ balances: { ...balances, USD: (balances.USD ?? 0) + amount } }).eq('user_id', userId)
    setMsg('✅ Depósito aprobado')
    setTimeout(() => setMsg(''), 3000)
    loadSection('deposits')
  }

  async function saveConfig(id: string, field: string, value: any) {
    await supabase.from('house_config').update({ [field]: value }).eq('id', id)
    setMsg('✅ Config guardada')
    setTimeout(() => setMsg(''), 3000)
    loadSection('config')
  }

  const filteredUsers = users.filter(u =>
    !userSearch || u.username?.toLowerCase().includes(userSearch.toLowerCase()) || u.email?.toLowerCase().includes(userSearch.toLowerCase())
  )

  if (loading) return (
    <div style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(212,175,55,0.4)', letterSpacing: '0.5em', fontSize: '0.7rem' }}>LOADING...</p>
    </div>
  )

  if (!authorized) return null

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;700&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: ${DARK}; color: #fff; font-family: 'Montserrat', sans-serif; }
        ::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-track { background: #111; } ::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.3); border-radius: 2px; }
        .admin-table { width: 100%; border-collapse: collapse; font-size: 0.72rem; }
        .admin-table th { padding: 10px 12px; text-align: left; font-size: 0.55rem; letter-spacing: 0.2em; color: rgba(255,255,255,0.35); font-weight: 400; border-bottom: 1px solid ${BORDER}; white-space: nowrap; }
        .admin-table td { padding: 10px 12px; border-bottom: 1px solid rgba(255,255,255,0.04); vertical-align: middle; }
        .admin-table tr:hover td { background: rgba(212,175,55,0.03); }
        .stat-card { background: ${PANEL}; border: 1px solid ${BORDER}; border-radius: 6px; padding: 20px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 0.48rem; font-weight: 700; letter-spacing: 0.1em; }
        .badge-green { background: rgba(74,222,128,0.1); color: #4ade80; border: 1px solid rgba(74,222,128,0.2); }
        .badge-red { background: rgba(248,113,113,0.1); color: #f87171; border: 1px solid rgba(248,113,113,0.2); }
        .badge-gold { background: rgba(212,175,55,0.1); color: ${GOLD}; border: 1px solid rgba(212,175,55,0.2); }
        .badge-gray { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.4); border: 1px solid rgba(255,255,255,0.08); }
        .admin-input { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 8px 12px; color: #fff; font-size: 0.72rem; font-family: 'Montserrat', sans-serif; width: 100%; outline: none; }
        .admin-input:focus { border-color: rgba(212,175,55,0.4); }
        .admin-btn { border: none; border-radius: 4px; padding: 8px 16px; font-size: 0.6rem; font-weight: 700; letter-spacing: 0.15em; cursor: pointer; font-family: 'Montserrat', sans-serif; touch-action: manipulation; transition: opacity 0.15s; }
        .admin-btn:hover { opacity: 0.85; }
        .admin-btn-gold { background: ${GOLD}; color: #000; }
        .admin-btn-outline { background: transparent; color: ${GOLD}; border: 1px solid rgba(212,175,55,0.3); }
        .admin-btn-red { background: rgba(220,38,38,0.8); color: #fff; }
        .admin-btn-green { background: rgba(22,163,74,0.8); color: #fff; }
        .nav-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 4px; cursor: pointer; transition: all 0.15s; font-size: 0.65rem; letter-spacing: 0.05em; touch-action: manipulation; border: none; width: 100%; text-align: left; font-family: 'Montserrat', sans-serif; }
        .nav-item:hover { background: rgba(212,175,55,0.08); }
        .nav-item.active { background: rgba(212,175,55,0.12); color: ${GOLD}; }
        .section-title { font-family: 'Cormorant Garamond', serif; font-size: 1.8rem; font-weight: 300; color: #fff; letter-spacing: 0.1em; margin-bottom: 4px; }
        .section-sub { font-size: 0.5rem; letter-spacing: 0.25em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin-bottom: 24px; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh', background: DARK }}>
        <aside style={{ width: sidebarOpen ? 220 : 60, background: PANEL, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column', transition: 'width 0.25s ease', overflow: 'hidden', flexShrink: 0, position: 'sticky', top: 0, height: '100vh' }}>
          <div style={{ padding: '20px 16px', borderBottom: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {sidebarOpen && (
              <div>
                <p style={{ fontSize: '0.42rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>HWA CASINO</p>
                <p style={{ fontSize: '0.8rem', color: GOLD, fontWeight: 700, letterSpacing: '0.1em' }}>ADMIN</p>
              </div>
            )}
            <button onPointerDown={() => setSidebarOpen(p => !p)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer', fontSize: '1rem', padding: '4px', touchAction: 'manipulation' }}>
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
          <nav style={{ flex: 1, padding: '12px 8px', display: 'flex', flexDirection: 'column', gap: '2px', overflowY: 'auto' }}>
            {NAV.map(item => (
              <button key={item.id} className={`nav-item${section === item.id ? ' active' : ''}`}
                onPointerDown={() => setSection(item.id)}
                style={{ color: section === item.id ? GOLD : 'rgba(255,255,255,0.45)', background: section === item.id ? 'rgba(212,175,55,0.12)' : 'transparent' }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>
          <div style={{ padding: '12px 8px', borderTop: `1px solid ${BORDER}` }}>
            <button className="nav-item" onPointerDown={() => router.push('/')} style={{ color: 'rgba(255,255,255,0.25)' }}>
              <span style={{ fontSize: '0.9rem' }}>⌂</span>
              {sidebarOpen && <span>Inicio</span>}
            </button>
            <button className="nav-item" onPointerDown={async () => { await supabase.auth.signOut(); router.replace('/') }} style={{ color: 'rgba(255,255,255,0.25)' }}>
              <span style={{ fontSize: '0.9rem' }}>→</span>
              {sidebarOpen && <span>Salir</span>}
            </button>
          </div>
        </aside>

        <main style={{ flex: 1, padding: '32px', overflowY: 'auto', minWidth: 0 }}>
          {msg && (
            <div style={{ position: 'fixed', top: 20, right: 24, background: '#1a1a1a', border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '10px 20px', fontSize: '0.7rem', color: GOLD, zIndex: 999 }}>
              {msg}
            </div>
          )}

          {section === 'overview' && (
            <div>
              <p className="section-title">Overview</p>
              <p className="section-sub">Resumen general del negocio</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
                {[
                  { label: 'USUARIOS TOTALES', value: stats?.totalUsers ?? '...', color: GOLD },
                  { label: 'DEPÓSITOS', value: stats?.totalDeposits ?? '...', color: '#4ade80' },
                  { label: 'VOLUMEN APOSTADO', value: (stats?.totalVolume ?? 0).toLocaleString('es-UY') + ' CHIPS', color: '#60a5fa' },
                  { label: 'RONDAS JUGADAS', value: stats?.totalRounds ?? '...', color: '#f472b6' },
                ].map((s, i) => (
                  <div key={i} className="stat-card">
                    <p style={{ fontSize: '0.45rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', marginBottom: '12px', textTransform: 'uppercase' }}>{s.label}</p>
                    <p style={{ fontSize: '1.8rem', color: s.color, fontWeight: 700, fontFamily: "'Cormorant Garamond', serif" }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '20px' }}>
                <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', textTransform: 'uppercase' }}>Estado del sistema</p>
                {[
                  { label: 'API Supabase', status: 'ONLINE' },
                  { label: 'Ruleta Sophie', status: 'ONLINE' },
                  { label: 'Pagos PayPal', status: 'ACTIVO' },
                  { label: 'Bot Telegram', status: 'ACTIVO' },
                ].map((s, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)' }}>{s.label}</p>
                    <span className="badge badge-green">{s.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {section === 'users' && (
            <div>
              <p className="section-title">Usuarios</p>
              <p className="section-sub">Gestión de miembros y roles</p>
              <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                <input className="admin-input" placeholder="Buscar por username o email..." value={userSearch} onChange={e => setUserSearch(e.target.value)} style={{ maxWidth: 320 }} />
                <button className="admin-btn admin-btn-outline" onPointerDown={() => loadSection('users')}>↻ Refrescar</button>
              </div>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr>
                    <th>USERNAME</th><th>EMAIL</th><th>ROL</th><th>ESTADO</th>
                    <th>CHIPS</th><th>GASTO HIST.</th><th>CÓDIGO</th>
                    <th>ÚLTIMO JUEGO</th><th>REGISTRO</th><th>ÚLTIMA CONEXIÓN</th><th>ACCIONES</th>
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map((u) => {
                      const chips = (u.balances?.CHIPS ?? 0).toLocaleString('es-UY')
                      const spent = (u.total_spent ?? 0).toLocaleString('es-UY')
                      const lastSeen = u.last_sign_in_at ? new Date(u.last_sign_in_at) : null
                      const isOnline = lastSeen && (Date.now() - lastSeen.getTime()) < 30 * 60 * 1000
                      return (
                        <tr key={u.id}>
                          <td style={{ color: GOLD, fontWeight: 600 }}>{u.username ?? '—'}</td>
                          <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }}>{u.email ?? '—'}</td>
                          <td>
                            <select value={u.role ?? 'user'} onChange={e => updateUserRole(u.id, e.target.value)}
                              style={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '0.6rem', cursor: 'pointer' }}>
                              {['user','vip','support','operator','admin','superadmin'].map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                          </td>
                          <td><span className={`badge ${isOnline ? 'badge-green' : 'badge-gray'}`}>{isOnline ? 'ONLINE' : 'OFFLINE'}</span></td>
                          <td style={{ color: GOLD, fontWeight: 700 }}>{chips}</td>
                          <td style={{ color: '#f87171' }}>{spent}</td>
                          <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontFamily: 'monospace' }}>{u.invite_code ?? '—'}</td>
                          <td style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.6rem' }}>{u.last_game ?? '—'}</td>
                          <td style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>{u.created_at ? new Date(u.created_at).toLocaleDateString('es-UY') : '—'}</td>
                          <td style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>{lastSeen ? lastSeen.toLocaleString('es-UY') : '—'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="admin-btn admin-btn-green" style={{ padding: '4px 10px', fontSize: '0.52rem' }}
                                onPointerDown={() => { const amt = parseInt(prompt('Chips a acreditar:') ?? '0'); if (amt > 0) adjustBalance(u.id, amt, 'credit') }}>+ Chips</button>
                              <button className="admin-btn admin-btn-red" style={{ padding: '4px 10px', fontSize: '0.52rem' }}
                                onPointerDown={() => { const amt = parseInt(prompt('Chips a debitar:') ?? '0'); if (amt > 0) adjustBalance(u.id, amt, 'debit') }}>- Chips</button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'codes' && (
            <div>
              <p className="section-title">Códigos VIP</p>
              <p className="section-sub">Gestión de invitaciones</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', padding: '20px', marginBottom: '24px' }}>
                <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '16px', textTransform: 'uppercase' }}>Crear nuevo código</p>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
                  <div>
                    <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>CÓDIGO</p>
                    <input className="admin-input" placeholder="VIP-XXXX-XXXX" value={newCode.code} onChange={e => setNewCode(p => ({ ...p, code: e.target.value.toUpperCase() }))} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>MAX USOS</p>
                    <input className="admin-input" type="number" min="1" value={newCode.max_uses} onChange={e => setNewCode(p => ({ ...p, max_uses: parseInt(e.target.value) }))} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>CHIPS BONO</p>
                    <input className="admin-input" type="number" min="0" value={newCode.bonus_chips} onChange={e => setNewCode(p => ({ ...p, bonus_chips: parseInt(e.target.value) }))} />
                  </div>
                  <div>
                    <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.3)', marginBottom: '6px' }}>VENCE</p>
                    <input className="admin-input" type="date" value={newCode.expires_at} onChange={e => setNewCode(p => ({ ...p, expires_at: e.target.value }))} />
                  </div>
                  <button className="admin-btn admin-btn-gold" onPointerDown={createCode} disabled={saving}>{saving ? '...' : 'CREAR'}</button>
                </div>
              </div>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>CÓDIGO</th><th>USOS</th><th>MAX</th><th>CHIPS</th><th>VENCE</th><th>ESTADO</th></tr></thead>
                  <tbody>
                    {codes.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: GOLD, fontWeight: 700, fontFamily: 'monospace', fontSize: '0.8rem' }}>{c.code}</td>
                        <td>{c.used_count ?? 0}</td>
                        <td>{c.max_uses ?? 1}</td>
                        <td style={{ color: '#4ade80' }}>{(c.bonus_chips ?? 0).toLocaleString('es-UY')}</td>
                        <td style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.6rem' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-UY') : 'Sin vencimiento'}</td>
                        <td><span className={`badge ${(c.used_count ?? 0) >= (c.max_uses ?? 1) ? 'badge-red' : 'badge-green'}`}>{(c.used_count ?? 0) >= (c.max_uses ?? 1) ? 'AGOTADO' : 'ACTIVO'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'wallets' && (
            <div>
              <p className="section-title">Wallets & Transacciones</p>
              <p className="section-sub">Movimientos de fondos</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>USUARIO</th><th>TIPO</th><th>MONTO</th><th>BALANCE DESPUÉS</th><th>RAZÓN</th><th>FECHA</th></tr></thead>
                  <tbody>
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td style={{ color: GOLD }}>{t.user_id?.slice(0, 8)}</td>
                        <td><span className={`badge ${t.type === 'credit' ? 'badge-green' : 'badge-red'}`}>{t.type?.toUpperCase()}</span></td>
                        <td style={{ color: t.type === 'credit' ? '#4ade80' : '#f87171', fontWeight: 700 }}>{t.type === 'credit' ? '+' : '-'}{(t.amount ?? 0).toLocaleString('es-UY')}</td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>{(t.balance_after ?? 0).toLocaleString('es-UY')}</td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem' }}>{t.reason ?? '—'}</td>
                        <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{t.created_at ? new Date(t.created_at).toLocaleDateString('es-UY') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'games' && (
            <div>
              <p className="section-title">Juegos & Rondas</p>
              <p className="section-sub">Historial de actividad en mesa</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>RONDA</th><th>SALA</th><th>ESTADO</th><th>NÚMERO</th><th>FECHA</th></tr></thead>
                  <tbody>
                    {rounds.map((r) => (
                      <tr key={r.id}>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.6rem', fontFamily: 'monospace' }}>{r.id?.slice(0, 8)}...</td>
                        <td style={{ color: GOLD }}>{r.room_id ?? '—'}</td>
                        <td><span className={`badge ${r.status === 'spinning' ? 'badge-gold' : r.status === 'closed' ? 'badge-gray' : 'badge-green'}`}>{r.status?.toUpperCase() ?? '—'}</span></td>
                        <td style={{ fontSize: '1.1rem', fontWeight: 700 }}>{r.winning_number ?? '—'}</td>
                        <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{r.created_at ? new Date(r.created_at).toLocaleDateString('es-UY') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'deposits' && (
            <div>
              <p className="section-title">Depósitos & Retiros</p>
              <p className="section-sub">Gestión de movimientos de dinero real</p>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '12px', textTransform: 'uppercase' }}>Depósitos</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto', marginBottom: '28px' }}>
                <table className="admin-table">
                  <thead><tr><th>USUARIO</th><th>MONTO</th><th>MÉTODO</th><th>ESTADO</th><th>FECHA</th><th>ACCIÓN</th></tr></thead>
                  <tbody>
                    {deposits.map((d) => (
                      <tr key={d.id}>
                        <td style={{ color: GOLD }}>{d.profiles?.username ?? d.user_id?.slice(0, 8)}</td>
                        <td style={{ color: '#4ade80', fontWeight: 700 }}>${(d.amount ?? 0).toLocaleString('es-UY')}</td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>{d.method ?? 'PayPal'}</td>
                        <td><span className={`badge ${d.status === 'approved' ? 'badge-green' : d.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>{d.status?.toUpperCase() ?? 'PENDIENTE'}</span></td>
                        <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{d.created_at ? new Date(d.created_at).toLocaleDateString('es-UY') : '—'}</td>
                        <td>{d.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="admin-btn admin-btn-green" style={{ padding: '4px 10px', fontSize: '0.52rem' }} onPointerDown={() => approveDeposit(d.id, d.user_id, d.amount)}>✓</button>
                            <button className="admin-btn admin-btn-red" style={{ padding: '4px 10px', fontSize: '0.52rem' }} onPointerDown={async () => { await supabase.from('deposit_requests').update({ status: 'rejected' }).eq('id', d.id); loadSection('deposits') }}>✗</button>
                          </div>
                        )}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: '0.55rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '12px', textTransform: 'uppercase' }}>Retiros</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>USUARIO</th><th>MONTO</th><th>MÉTODO</th><th>ESTADO</th><th>FECHA</th><th>ACCIÓN</th></tr></thead>
                  <tbody>
                    {withdrawals.map((w) => (
                      <tr key={w.id}>
                        <td style={{ color: GOLD }}>{w.profiles?.username ?? w.user_id?.slice(0, 8)}</td>
                        <td style={{ color: '#f87171', fontWeight: 700 }}>${(w.amount ?? 0).toLocaleString('es-UY')}</td>
                        <td style={{ color: 'rgba(255,255,255,0.5)' }}>{w.method ?? '—'}</td>
                        <td><span className={`badge ${w.status === 'approved' ? 'badge-green' : w.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>{w.status?.toUpperCase() ?? 'PENDIENTE'}</span></td>
                        <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{w.created_at ? new Date(w.created_at).toLocaleDateString('es-UY') : '—'}</td>
                        <td>{w.status === 'pending' && (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="admin-btn admin-btn-green" style={{ padding: '4px 10px', fontSize: '0.52rem' }} onPointerDown={async () => { await supabase.from('withdraw_requests').update({ status: 'approved' }).eq('id', w.id); loadSection('deposits') }}>✓</button>
                            <button className="admin-btn admin-btn-red" style={{ padding: '4px 10px', fontSize: '0.52rem' }} onPointerDown={async () => { await supabase.from('withdraw_requests').update({ status: 'rejected' }).eq('id', w.id); loadSection('deposits') }}>✗</button>
                          </div>
                        )}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'bonuses' && (
            <div>
              <p className="section-title">Bonos & Promociones</p>
              <p className="section-sub">Gestión de incentivos</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>USUARIO</th><th>TIPO</th><th>MONTO</th><th>ESTADO</th><th>VENCE</th><th>FECHA</th></tr></thead>
                  <tbody>
                    {bonuses.map((b) => (
                      <tr key={b.id}>
                        <td style={{ color: GOLD }}>{b.profiles?.username ?? b.user_id?.slice(0, 8)}</td>
                        <td><span className="badge badge-gold">{b.bonus_type?.toUpperCase() ?? 'BONO'}</span></td>
                        <td style={{ color: '#4ade80', fontWeight: 700 }}>{(b.amount ?? 0).toLocaleString('es-UY')} CHIPS</td>
                        <td><span className={`badge ${b.status === 'active' ? 'badge-green' : b.status === 'used' ? 'badge-gray' : 'badge-red'}`}>{b.status?.toUpperCase() ?? '—'}</span></td>
                        <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{b.expires_at ? new Date(b.expires_at).toLocaleDateString('es-UY') : 'Sin vencimiento'}</td>
                        <td style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.6rem' }}>{b.created_at ? new Date(b.created_at).toLocaleDateString('es-UY') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'config' && (
            <div>
              <p className="section-title">Configuración</p>
              <p className="section-sub">Parámetros del casino</p>
              <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: '6px', overflow: 'auto' }}>
                <table className="admin-table">
                  <thead><tr><th>JUEGO</th><th>RTP %</th><th>EDGE %</th><th>ACTIVO</th><th>ACCIÓN</th></tr></thead>
                  <tbody>
                    {houseConfig.map((c) => (
                      <tr key={c.id}>
                        <td style={{ color: GOLD, fontWeight: 600 }}>{c.game_type?.toUpperCase() ?? '—'}</td>
                        <td><input className="admin-input" type="number" defaultValue={c.rtp_pct} style={{ width: 80 }} onBlur={e => saveConfig(c.id, 'rtp_pct', parseFloat(e.target.value))} /></td>
                        <td><input className="admin-input" type="number" defaultValue={c.edge_pct} style={{ width: 80 }} onBlur={e => saveConfig(c.id, 'edge_pct', parseFloat(e.target.value))} /></td>
                        <td>
                          <button className={`admin-btn ${c.is_active ? 'admin-btn-green' : 'admin-btn-red'}`} style={{ padding: '4px 12px', fontSize: '0.52rem' }}
                            onPointerDown={() => saveConfig(c.id, 'is_active', !c.is_active)}>
                            {c.is_active ? 'ACTIVO' : 'INACTIVO'}
                          </button>
                        </td>
                        <td><button className="admin-btn admin-btn-outline" style={{ padding: '4px 12px', fontSize: '0.52rem' }} onPointerDown={() => loadSection('config')}>↻</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </>
  )
}
