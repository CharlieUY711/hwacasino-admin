// hooks/useWallet.ts
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export type Currency = 'CHIPS' | 'USD' | 'UYU' | 'BTC' | 'ETH' | 'USDT'

export function useWallet(currency: Currency = 'CHIPS') {
  const [balance, setBalance]   = useState<number>(0)
  const [balances, setBalances] = useState<Record<string, number>>({})
  const [username, setUsername] = useState<string>('')
  const [loading, setLoading]   = useState(true)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || cancelled) { setLoading(false); return }

      // Cargar wallet
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balances')
        .eq('user_id', user.id)
        .single()

      // Cargar username desde profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single()

      if (!cancelled) {
        const b = wallet?.balances ?? { CHIPS: 0 }
        setBalances(b)
        setBalance(Number(b[currency] ?? 0))
        setUsername(
          profile?.username ??
          user.user_metadata?.display_name ??
          user.email?.split('@')[0] ??
          'Jugador'
        )
        setLoading(false)
      }

      // Realtime — escuchar cambios en la wallet
      if (channelRef.current) {
        channelRef.current.unsubscribe()
        channelRef.current = null
      }

      const channel = supabase
        .channel(`wallet:${user.id}:${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event:  'UPDATE',
            schema: 'public',
            table:  'wallets',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const b = (payload.new as { balances: Record<string, number> }).balances
            setBalances(b)
            setBalance(Number(b[currency] ?? 0))
          }
        )
        .subscribe()

      channelRef.current = channel
    }

    init()

    return () => {
      cancelled = true
      channelRef.current?.unsubscribe()
      channelRef.current = null
    }
  }, [currency])

  const formatBalance = (n: number = balance, cur: Currency = currency) => {
    if (cur === 'CHIPS') return n.toLocaleString('es-UY') + ' N'
    if (cur === 'BTC' || cur === 'ETH') return n.toFixed(8) + ' ' + cur
    return n.toLocaleString('es-UY', { minimumFractionDigits: 2 }) + ' ' + cur
  }

  // Compatibilidad con el código existente
  const formatChips = (n: number) => n.toLocaleString('es-UY') + ' N'

  return { balance, balances, loading, formatBalance, formatChips, username, currency }
}

