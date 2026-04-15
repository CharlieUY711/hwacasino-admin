'use client'
export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useWallet } from '@/hooks/useWallet'

const GOLD = '#D4AF37'
const DARK = '#0A0A0A'

const GAMES = [
  { id: 'roulette', label: 'ROULETTE', sub: 'THE CLASSICS', emoji: '🎡', route: '/roulette/play', status: 'live', gradient: 'linear-gradient(160deg,#1a0a00,#2d1200,#0a0a0a)' },
  { id: 'blackjack', label: 'BLACKJACK', sub: 'PRIVATE TABLE', emoji: '🃏', route: '/lobby/blackjack', status: 'soon', gradient: 'linear-gradient(160deg,#001a0a,#002d14,#0a0a0a)' },
  { id: 'slots', label: 'SLOTS', sub: 'HIGH VOLATILITY', emoji: '🎰', route: '/lobby/slots', status: 'soon', gradient: 'linear-gradient(160deg,#0a001a,#14002d,#0a0a0a)' },
  { id: 'dice', label: 'DICE', sub: 'PROVABLY FAIR', emoji: '🎲', route: '/lobby/dice', status: 'soon', gradient: 'linear-gradient(160deg,#0a0800,#1a1400,#0a0a0a)' },
  { id: 'bingo', label: 'BINGO', sub: 'LIVE SESSIONS', emoji: '🎱', route: '/lobby/bingo', status: 'soon', gradient: 'linear-gradient(160deg,#00101a,#001a2d,#0a0a0a)' },
]

type Tab = 'home' | 'games' | 'history' | 'wallet' | 'profile'

export default function DashboardPage() {
  const router = useRouter()
  const { balance, balances, formatChips } = useWallet()
  const [tab, setTab] = useState<Tab>('home')
  const [username, setUsername] = useState('MEMBER')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = 'https://www.hwacasino.com'; return }
      setUserId(session.user.id)
      setEmail(session.user.email ?? '')
      const { data: profile } = await supabase.from('profiles').select('username').eq('id', session.user.id).single()
      setUsername(profile?.username?.toUpperCase() ?? 'MEMBER')
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (!userId || tab !== 'history') return
    supabase.from('game_rounds').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setHistory(data ?? []))
  }, [userId, tab])

  useEffect(() => {
    if (!userId || tab !== 'wallet') return
    supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(20)
      .then(({ data }) => setTransactions(data ?? []))
  }, [userId, tab])

  if (loading) return (
    <main style={{ minHeight: '100vh', background: DARK, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'rgba(212,175,55,0.3)', letterSpacing: '0.5em', fontSize: '0.65rem', fontFamily: 'serif' }}>LOADING...</p>
    </main>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600;700&family=Montserrat:wght@200;300;400;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: ${DARK}; overflow-x: hidden; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }
        .fade-up { animation: fadeUp 0.5s ease both; }
        .game-card { transition: transform 0.25s ease; cursor: pointer; touch-action: manipulation; }
        .game-card:active { transform: scale(0.97); }
        .tab-btn { touch-action: manipulation; transition: color 0.2s ease; }
      `}</style>

      <main style={{ minHeight: '100dvh', background: DARK, fontFamily: "'Montserrat', sans-serif", maxWidth: '480px', margin: '0 auto', paddingBottom: '72px' }}>

        <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(212,175,55,0.1)', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(10px)', zIndex: 90 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo-hwa.png" alt="HWA" style={{ width: 36, height: 36, borderRadius: '50%', border: `1.5px solid ${GOLD}`, objectFit: 'cover' }} />
            <div>
              <p style={{ fontSize: '0.42rem', letterSpacing: '0.25em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase' }}>VIP MEMBER</p>
              <p style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600, letterSpacing: '0.1em' }}>{username}</p>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.42rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', marginBottom: '2px' }}>BALANCE</p>
            <p style={{ fontSize: '1rem', color: GOLD, fontWeight: 700 }}>{formatChips(balance)}</p>
          </div>
        </div>

        {tab === 'home' && (
          <div className="fade-up">
            <div style={{ padding: '28px 20px 20px' }}>
              <p style={{ fontSize: '0.48rem', letterSpacing: '0.4em', color: GOLD, textTransform: 'uppercase', marginBottom: '8px' }}>EXCLUSIVE ACCESS</p>
              <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.8rem', color: '#fff', fontWeight: 300, lineHeight: 1, marginBottom: '20px' }}>
                HWA <span style={{ color: GOLD, fontWeight: 700 }}>CASINO</span><br />EXPERIENCE
              </h1>
              <button onPointerDown={() => setTab('games')} style={{ background: GOLD, border: 'none', borderRadius: '2px', padding: '12px 24px', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '0.65rem', letterSpacing: '0.3em', color: '#000', cursor: 'pointer', touchAction: 'manipulation' }}>
                ENTER GAMES
              </button>
            </div>

            <div style={{ margin: '0 20px 24px', background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.15)', borderRadius: '8px', padding: '16px' }}>
              <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '12px' }}>MY WALLET</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { label: 'CHIPS', value: (balances?.CHIPS ?? 0).toLocaleString('es-UY') },
                  { label: 'USD', value: `$${(balances?.USD ?? 0).toLocaleString('es-UY')}` },
                  { label: 'USDT', value: (balances?.USDT ?? 0).toLocaleString('es-UY') },
                ].map(b => (
                  <div key={b.label} style={{ textAlign: 'center', padding: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <p style={{ fontSize: '0.38rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '4px' }}>{b.label}</p>
                    <p style={{ fontSize: '0.8rem', color: GOLD, fontWeight: 700 }}>{b.value}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '10px' }}>
                <button onPointerDown={() => router.push('/deposit')} style={{ background: GOLD, border: 'none', borderRadius: '4px', padding: '10px', fontSize: '0.55rem', fontWeight: 700, letterSpacing: '0.2em', color: '#000', cursor: 'pointer', touchAction: 'manipulation' }}>DEPOSITAR</button>
                <button onPointerDown={() => setTab('wallet')} style={{ background: 'transparent', border: '1px solid rgba(212,175,55,0.3)', borderRadius: '4px', padding: '10px', fontSize: '0.55rem', fontWeight: 600, letterSpacing: '0.2em', color: GOLD, cursor: 'pointer', touchAction: 'manipulation' }}>HISTORIAL</button>
              </div>
            </div>

            <div style={{ margin: '0 20px 24px' }}>
              <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '12px' }}>BONOS ACTIVOS</p>
              {[
                { icon: '🎁', title: 'Bono de Bienvenida', desc: 'Chips de bienvenida acreditados', status: 'ACTIVO', color: '#4ade80' },
                { icon: '♛', title: 'Cashback Semanal', desc: '5% de tus pérdidas de la semana', status: 'DISPONIBLE', color: GOLD },
              ].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ fontSize: '1.4rem' }}>{b.icon}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '0.65rem', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{b.title}</p>
                    <p style={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.35)' }}>{b.desc}</p>
                  </div>
                  <span style={{ fontSize: '0.42rem', fontWeight: 700, letterSpacing: '0.15em', color: b.color }}>{b.status}</span>
                </div>
              ))}
            </div>

            <div style={{ textAlign: 'center', padding: '8px 20px 16px' }}>
              <button onPointerDown={async () => { await supabase.auth.signOut(); window.location.href = 'https://www.hwacasino.com' }} style={{ background: 'transparent', border: 'none', fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.15)', cursor: 'pointer', textTransform: 'uppercase', touchAction: 'manipulation' }}>CERRAR SESIÓN</button>
            </div>
          </div>
        )}

        {tab === 'games' && (
          <div className="fade-up" style={{ padding: '24px 20px' }}>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '16px' }}>SELECCIONÁ TU JUEGO</p>
            <div className="game-card" onPointerDown={() => router.push('/roulette/play')} style={{ background: GAMES[0].gradient, border: '1px solid rgba(212,175,55,0.12)', borderRadius: '6px', padding: '28px 20px', marginBottom: '12px', position: 'relative', overflow: 'hidden', minHeight: '150px' }}>
              <div style={{ position: 'absolute', right: '-20px', top: '-20px', fontSize: '7rem', opacity: 0.06 }}>🎡</div>
              <div style={{ position: 'absolute', top: '12px', right: '12px', background: '#16a34a', borderRadius: '20px', padding: '3px 8px', fontSize: '0.38rem', letterSpacing: '0.15em', color: '#fff', fontWeight: 700 }}>● LIVE</div>
              <p style={{ fontSize: '0.42rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', textTransform: 'uppercase' }}>{GAMES[0].sub}</p>
              <h2 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '2.2rem', color: '#fff', fontWeight: 300, letterSpacing: '0.1em' }}>{GAMES[0].label}</h2>
              <p style={{ fontSize: '0.45rem', color: 'rgba(255,255,255,0.25)', marginTop: '4px' }}>Ruleta europea · Apuestas desde 10 CHIPS</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {GAMES.slice(1).map(game => (
                <div key={game.id} className="game-card" style={{ background: game.gradient, border: '1px solid rgba(212,175,55,0.08)', borderRadius: '6px', padding: '20px 14px', position: 'relative', overflow: 'hidden', minHeight: '120px', opacity: 0.5 }}>
                  <div style={{ position: 'absolute', right: '-8px', top: '-8px', fontSize: '4rem', opacity: 0.08 }}>{game.emoji}</div>
                  <div style={{ position: 'absolute', top: '10px', right: '10px', fontSize: '0.38rem', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.25)', fontWeight: 600 }}>PRONTO</div>
                  <h3 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.4rem', color: '#fff', fontWeight: 400, letterSpacing: '0.05em', marginBottom: '4px' }}>{game.label}</h3>
                  <p style={{ fontSize: '0.4rem', color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>{game.sub}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'history' && (
          <div className="fade-up" style={{ padding: '24px 20px' }}>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '16px' }}>HISTORIAL DE JUGADAS</p>
            {history.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', textAlign: 'center', marginTop: '60px' }}>Sin jugadas registradas aún.</p>
            ) : history.map((h, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 600, marginBottom: '2px' }}>{h.game_type ?? 'Roulette'}</p>
                  <p style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)' }}>{new Date(h.created_at).toLocaleDateString('es-UY')}</p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '0.7rem', fontWeight: 700, color: (h.payout ?? 0) > 0 ? '#4ade80' : '#f87171' }}>
                    {(h.payout ?? 0) > 0 ? '+' : ''}{(h.payout ?? 0).toLocaleString('es-UY')}
                  </p>
                  <p style={{ fontSize: '0.42rem', color: 'rgba(255,255,255,0.25)' }}>CHIPS</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'wallet' && (
          <div className="fade-up" style={{ padding: '24px 20px' }}>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '16px' }}>MI WALLET</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '20px' }}>
              {[
                { label: 'CHIPS', value: (balances?.CHIPS ?? 0).toLocaleString('es-UY') },
                { label: 'USD', value: `$${(balances?.USD ?? 0).toLocaleString('es-UY')}` },
                { label: 'USDT', value: (balances?.USDT ?? 0).toLocaleString('es-UY') },
              ].map(b => (
                <div key={b.label} style={{ textAlign: 'center', padding: '14px 8px', background: 'rgba(212,175,55,0.05)', borderRadius: '6px', border: '1px solid rgba(212,175,55,0.15)' }}>
                  <p style={{ fontSize: '0.38rem', letterSpacing: '0.2em', color: 'rgba(255,255,255,0.35)', marginBottom: '6px' }}>{b.label}</p>
                  <p style={{ fontSize: '0.9rem', color: GOLD, fontWeight: 700 }}>{b.value}</p>
                </div>
              ))}
            </div>
            <button onPointerDown={() => router.push('/deposit')} style={{ width: '100%', background: GOLD, border: 'none', borderRadius: '4px', padding: '14px', fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.3em', color: '#000', cursor: 'pointer', marginBottom: '24px', touchAction: 'manipulation' }}>
              DEPOSITAR / RETIRAR
            </button>
            <p style={{ fontSize: '0.45rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', marginBottom: '12px' }}>ÚLTIMAS TRANSACCIONES</p>
            {transactions.length === 0 ? (
              <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.65rem', textAlign: 'center', marginTop: '40px' }}>Sin transacciones aún.</p>
            ) : transactions.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <p style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 600, marginBottom: '2px', textTransform: 'capitalize' }}>{t.type ?? 'transacción'}</p>
                  <p style={{ fontSize: '0.46rem', color: 'rgba(255,255,255,0.3)' }}>{t.reason ?? ''} · {new Date(t.created_at).toLocaleDateString('es-UY')}</p>
                </div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: t.type === 'credit' ? '#4ade80' : '#f87171' }}>
                  {t.type === 'credit' ? '+' : '-'}{(t.amount ?? 0).toLocaleString('es-UY')}
                </p>
              </div>
            ))}
          </div>
        )}

        {tab === 'profile' && (
          <div className="fade-up" style={{ padding: '24px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: `2px solid ${GOLD}`, overflow: 'hidden', marginBottom: '12px' }}>
                <img src="/logo-hwa.png" alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.6 }} />
              </div>
              <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '1.6rem', color: '#fff', fontWeight: 300, letterSpacing: '0.2em' }}>{username}</p>
              <p style={{ fontSize: '0.48rem', color: 'rgba(255,255,255,0.3)', marginTop: '4px' }}>{email}</p>
              <div style={{ marginTop: '8px', background: 'rgba(212,175,55,0.1)', borderRadius: '20px', padding: '4px 12px', border: '1px solid rgba(212,175,55,0.3)' }}>
                <span style={{ fontSize: '0.42rem', letterSpacing: '0.2em', color: GOLD, fontWeight: 700 }}>VIP MEMBER</span>
              </div>
            </div>
            {[
              { label: 'Usuario', value: username },
              { label: 'Email', value: email },
              { label: 'Miembro desde', value: 'Abril 2026' },
              { label: 'Nivel', value: 'VIP' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <p style={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>{f.label}</p>
                <p style={{ fontSize: '0.62rem', color: '#fff', fontWeight: 500 }}>{f.value}</p>
              </div>
            ))}
            <button onPointerDown={async () => { await supabase.auth.signOut(); window.location.href = 'https://www.hwacasino.com' }} style={{ width: '100%', marginTop: '32px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '12px', fontSize: '0.55rem', letterSpacing: '0.3em', color: 'rgba(255,255,255,0.25)', cursor: 'pointer', touchAction: 'manipulation' }}>
              CERRAR SESIÓN
            </button>
          </div>
        )}

        <nav style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: '480px', background: '#0d0d0d', borderTop: '1px solid rgba(212,175,55,0.12)', display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', zIndex: 100 }}>
          {([
            { id: 'home',    icon: '⌂', label: 'INICIO' },
            { id: 'games',   icon: '♠', label: 'JUEGOS' },
            { id: 'history', icon: '◷', label: 'HISTORIAL' },
            { id: 'wallet',  icon: '◈', label: 'WALLET' },
            { id: 'profile', icon: '◎', label: 'PERFIL' },
          ] as { id: Tab; icon: string; label: string }[]).map(item => (
            <button key={item.id} className="tab-btn" onPointerDown={() => setTab(item.id)}
              style={{ background: 'transparent', border: 'none', color: tab === item.id ? GOLD : 'rgba(255,255,255,0.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '10px 0', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
              <span style={{ fontSize: '1rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.36rem', letterSpacing: '0.1em', fontWeight: tab === item.id ? 700 : 300 }}>{item.label}</span>
            </button>
          ))}
        </nav>

      </main>
    </>
  )
}

