/**
 * useZaika Hook
 * Custom hook for all Zaika-related operations
 */

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { ZAIKA_CONFIG } from '../utils/zaikaConfig'

/**
 * Main Zaika hook - provides all Zaika functionality
 */
export function useZaika() {
  const { supabase, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [isStallOwner, setIsStallOwner] = useState(false)
  const [stallData, setStallData] = useState(null)
  const [walletData, setWalletData] = useState(null)
  const [error, setError] = useState(null)

  // Check if current user is a stall owner
  const checkStallOwner = useCallback(async () => {
    if (!profile?.id || !supabase) return false

    try {
      const { data, error } = await supabase.rpc('is_zaika_stall_owner', {
        user_profile_id: profile.id
      })

      if (error) throw error
      return data === true
    } catch (err) {
      console.error('Error checking stall owner status:', err)
      return false
    }
  }, [profile?.id, supabase])

  // Get stall data for stall owner
  const fetchStallData = useCallback(async () => {
    if (!profile?.id || !supabase) return null

    try {
      const { data, error } = await supabase.rpc('get_my_zaika_stall', {
        user_profile_id: profile.id
      })

      if (error) throw error
      return data?.[0] || null
    } catch (err) {
      console.error('Error fetching stall data:', err)
      return null
    }
  }, [profile?.id, supabase])

  // Get or create wallet for buyer
  const fetchOrCreateWallet = useCallback(async () => {
    if (!profile?.id || !supabase) return null

    try {
      const { data, error } = await supabase.rpc('get_or_create_zaika_wallet', {
        user_profile_id: profile.id
      })

      if (error) throw error
      return data
    } catch (err) {
      console.error('Error fetching wallet:', err)
      return null
    }
  }, [profile?.id, supabase])

  // Initialize - check role and fetch relevant data
  const initialize = useCallback(async () => {
    if (!profile?.id || !supabase) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const isOwner = await checkStallOwner()
      setIsStallOwner(isOwner)

      if (isOwner) {
        const stall = await fetchStallData()
        setStallData(stall)
      } else {
        const wallet = await fetchOrCreateWallet()
        setWalletData(wallet)
      }
    } catch (err) {
      console.error('Zaika initialization error:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [profile?.id, supabase, checkStallOwner, fetchStallData, fetchOrCreateWallet])

  useEffect(() => {
    initialize()
  }, [initialize])

  return {
    loading,
    isStallOwner,
    stallData,
    walletData,
    error,
    refresh: initialize,
  }
}

/**
 * Hook for wallet operations (buyers)
 */
export function useZaikaWallet() {
  const { supabase, profile } = useAuth()
  const [wallet, setWallet] = useState(null)
  const [topupRequests, setTopupRequests] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchWallet = useCallback(async () => {
    if (!profile?.id || !supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_wallets')
        .select('*')
        .eq('profile_id', profile.id)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      setWallet(data)
    } catch (err) {
      console.error('Error fetching wallet:', err)
    }
  }, [profile?.id, supabase])

  const fetchTopupRequests = useCallback(async () => {
    if (!profile?.id || !supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_topup_requests')
        .select('*')
        .eq('profile_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTopupRequests(data || [])
    } catch (err) {
      console.error('Error fetching topup requests:', err)
    }
  }, [profile?.id, supabase])

  const createTopupRequest = useCallback(async (amount) => {
    if (!profile?.id || !supabase) throw new Error('Not authenticated')
    if (amount < ZAIKA_CONFIG.MIN_TOPUP_AMOUNT) {
      throw new Error(`Minimum amount is ₹${ZAIKA_CONFIG.MIN_TOPUP_AMOUNT}`)
    }

    const { data, error } = await supabase
      .from('zaika_topup_requests')
      .insert({
        profile_id: profile.id,
        amount: amount,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    await fetchTopupRequests()
    return data
  }, [profile?.id, supabase, fetchTopupRequests])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchWallet(), fetchTopupRequests()])
      setLoading(false)
    }
    load()
  }, [fetchWallet, fetchTopupRequests])

  // Real-time subscription for wallet updates
  useEffect(() => {
    if (!profile?.id || !supabase) return

    const channel = supabase
      .channel('wallet-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zaika_wallets',
        filter: `profile_id=eq.${profile.id}`
      }, () => {
        fetchWallet()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zaika_topup_requests',
        filter: `profile_id=eq.${profile.id}`
      }, () => {
        fetchTopupRequests()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [profile?.id, supabase, fetchWallet, fetchTopupRequests])

  return {
    wallet,
    topupRequests,
    loading,
    createTopupRequest,
    refresh: () => Promise.all([fetchWallet(), fetchTopupRequests()]),
  }
}

/**
 * Hook for stall operations (stall owners)
 */
export function useZaikaStall(stallId) {
  const { supabase, profile } = useAuth()
  const [stall, setStall] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStall = useCallback(async () => {
    if (!stallId || !supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_stalls')
        .select(`
          *,
          registration:registrations(
            profile:profiles(full_name, roll_number)
          )
        `)
        .eq('id', stallId)
        .single()

      if (error) throw error
      setStall(data)
    } catch (err) {
      console.error('Error fetching stall:', err)
    }
  }, [stallId, supabase])

  const fetchMenuItems = useCallback(async () => {
    if (!stallId || !supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_menu_items')
        .select('*')
        .eq('stall_id', stallId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMenuItems(data || [])
    } catch (err) {
      console.error('Error fetching menu items:', err)
    }
  }, [stallId, supabase])

  const fetchPendingRequests = useCallback(async () => {
    if (!stallId || !supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_transactions')
        .select(`
          *,
          buyer:profiles!zaika_transactions_buyer_profile_id_fkey(
            full_name, roll_number
          )
        `)
        .eq('stall_id', stallId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingRequests(data || [])
    } catch (err) {
      console.error('Error fetching pending requests:', err)
    }
  }, [stallId, supabase])

  const fetchTransactions = useCallback(async () => {
    if (!stallId || !supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_transactions')
        .select(`
          *,
          buyer:profiles!zaika_transactions_buyer_profile_id_fkey(
            full_name, roll_number
          )
        `)
        .eq('stall_id', stallId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
    }
  }, [stallId, supabase])

  // Menu item operations
  const addMenuItem = useCallback(async (item) => {
    if (!stallId || !supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('zaika_menu_items')
      .insert({
        stall_id: stallId,
        name: item.name,
        price: item.price,
        image_url: item.image_url || null,
        description: item.description || null,
        is_available: true
      })
      .select()
      .single()

    if (error) throw error
    await fetchMenuItems()
    return data
  }, [stallId, supabase, fetchMenuItems])

  const updateMenuItem = useCallback(async (itemId, updates) => {
    if (!supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('zaika_menu_items')
      .update(updates)
      .eq('id', itemId)
      .select()
      .single()

    if (error) throw error
    await fetchMenuItems()
    return data
  }, [supabase, fetchMenuItems])

  const deleteMenuItem = useCallback(async (itemId) => {
    if (!supabase) throw new Error('Not authenticated')

    const { error } = await supabase
      .from('zaika_menu_items')
      .delete()
      .eq('id', itemId)

    if (error) throw error
    await fetchMenuItems()
  }, [supabase, fetchMenuItems])

  // Transaction operations
  const acceptTransaction = useCallback(async (transactionId) => {
    if (!supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('complete_zaika_transaction', {
      p_transaction_id: transactionId
    })

    if (error) throw error
    await Promise.all([fetchPendingRequests(), fetchTransactions(), fetchStall()])
    return data
  }, [supabase, fetchPendingRequests, fetchTransactions, fetchStall])

  const rejectTransaction = useCallback(async (transactionId) => {
    if (!supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('reject_zaika_transaction', {
      p_transaction_id: transactionId
    })

    if (error) throw error
    await Promise.all([fetchPendingRequests(), fetchTransactions()])
    return data
  }, [supabase, fetchPendingRequests, fetchTransactions])

  // Update stall name
  const updateStallName = useCallback(async (newName) => {
    if (!stallId || !supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('zaika_stalls')
      .update({ stall_name: newName, updated_at: new Date().toISOString() })
      .eq('id', stallId)
      .select()
      .single()

    if (error) throw error
    await fetchStall()
    return data
  }, [stallId, supabase, fetchStall])

  // Update stall status (open/close)
  const updateStallStatus = useCallback(async (isActive) => {
    if (!stallId || !supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('zaika_stalls')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', stallId)
      .select()
      .single()

    if (error) throw error
    await fetchStall()
    return data
  }, [stallId, supabase, fetchStall])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([
        fetchStall(),
        fetchMenuItems(),
        fetchPendingRequests(),
        fetchTransactions()
      ])
      setLoading(false)
    }
    load()
  }, [fetchStall, fetchMenuItems, fetchPendingRequests, fetchTransactions])

  // Real-time subscription for new orders
  useEffect(() => {
    if (!stallId || !supabase) return

    const channel = supabase
      .channel(`stall-${stallId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'zaika_transactions',
        filter: `stall_id=eq.${stallId}`
      }, () => {
        fetchPendingRequests()
        fetchTransactions()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'zaika_transactions',
        filter: `stall_id=eq.${stallId}`
      }, () => {
        fetchPendingRequests()
        fetchTransactions()
        fetchStall()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [stallId, supabase, fetchPendingRequests, fetchTransactions, fetchStall])

  return {
    stall,
    menuItems,
    pendingRequests,
    transactions,
    loading,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    acceptTransaction,
    rejectTransaction,
    updateStallName,
    updateStallStatus,
    refresh: () => Promise.all([
      fetchStall(),
      fetchMenuItems(),
      fetchPendingRequests(),
      fetchTransactions()
    ]),
  }
}

/**
 * Hook for browsing stalls (buyers)
 */
export function useZaikaStalls() {
  const { supabase } = useAuth()
  const [stalls, setStalls] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStalls = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase.rpc('get_all_zaika_stalls')

      if (error) throw error
      setStalls(data || [])
    } catch (err) {
      console.error('Error fetching stalls:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchStalls()
  }, [fetchStalls])

  return {
    stalls,
    loading,
    refresh: fetchStalls,
  }
}

/**
 * Hook for viewing a single stall's menu (buyers)
 */
export function useZaikaStallMenu(stallId) {
  const { supabase } = useAuth()
  const [stall, setStall] = useState(null)
  const [menuItems, setMenuItems] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchStallAndMenu = useCallback(async () => {
    if (!stallId || !supabase) return

    try {
      // Fetch stall info
      const { data: stallData, error: stallError } = await supabase
        .from('zaika_stalls')
        .select(`
          *,
          registration:registrations(
            profile:profiles(full_name, roll_number)
          )
        `)
        .eq('id', stallId)
        .single()

      if (stallError) throw stallError
      setStall(stallData)

      // Fetch menu items
      const { data: menuData, error: menuError } = await supabase
        .from('zaika_menu_items')
        .select('*')
        .eq('stall_id', stallId)
        .eq('is_available', true)
        .order('created_at', { ascending: false })

      if (menuError) throw menuError
      setMenuItems(menuData || [])
    } catch (err) {
      console.error('Error fetching stall menu:', err)
    } finally {
      setLoading(false)
    }
  }, [stallId, supabase])

  useEffect(() => {
    fetchStallAndMenu()
  }, [fetchStallAndMenu])

  return {
    stall,
    menuItems,
    loading,
    refresh: fetchStallAndMenu,
  }
}

/**
 * Hook for making purchases (buyers)
 */
export function useZaikaPurchase() {
  const { supabase, profile } = useAuth()
  const [pendingTransactions, setPendingTransactions] = useState([])
  const [orderHistory, setOrderHistory] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPendingTransactions = useCallback(async () => {
    if (!profile?.id || !supabase) return

    try {
      // Fetch transactions with stall info - item_name is stored in transaction
      const { data, error } = await supabase
        .from('zaika_transactions')
        .select(`
          id,
          buyer_profile_id,
          stall_id,
          menu_item_id,
          item_name,
          quantity,
          unit_price,
          total_amount,
          status,
          created_at,
          completed_at,
          stall:zaika_stalls(stall_number, stall_name)
        `)
        .eq('buyer_profile_id', profile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPendingTransactions(data || [])
    } catch (err) {
      console.error('Error fetching pending transactions:', err)
    }
  }, [profile?.id, supabase])

  const fetchOrderHistory = useCallback(async () => {
    if (!profile?.id || !supabase) return

    try {
      // Fetch completed and rejected transactions (history)
      const { data, error } = await supabase
        .from('zaika_transactions')
        .select(`
          id,
          buyer_profile_id,
          stall_id,
          menu_item_id,
          item_name,
          quantity,
          unit_price,
          total_amount,
          status,
          created_at,
          completed_at,
          stall:zaika_stalls(stall_number, stall_name)
        `)
        .eq('buyer_profile_id', profile.id)
        .in('status', ['completed', 'rejected', 'cancelled'])
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setOrderHistory(data || [])
    } catch (err) {
      console.error('Error fetching order history:', err)
    }
  }, [profile?.id, supabase])

  const createPurchase = useCallback(async (stallIdOrOptions, menuItemId, quantity) => {
    if (!profile?.id || !supabase) throw new Error('Not authenticated')

    // Support both object and separate argument styles
    let stallId, itemId, qty
    if (typeof stallIdOrOptions === 'object' && stallIdOrOptions !== null) {
      // Object style: createPurchase({ stallId, menuItemId, quantity })
      stallId = stallIdOrOptions.stallId
      itemId = stallIdOrOptions.menuItemId
      qty = stallIdOrOptions.quantity || 1
    } else {
      // Separate arguments: createPurchase(stallId, menuItemId, quantity)
      stallId = stallIdOrOptions
      itemId = menuItemId
      qty = quantity || 1
    }

    // Validate inputs
    if (!stallId) throw new Error('Stall ID is required')
    if (!itemId) throw new Error('Menu item ID is required')
    if (!qty || qty < 1) throw new Error('Quantity must be at least 1')

    console.log('[createPurchase] Calling RPC with:', {
      p_buyer_id: profile.id,
      p_stall_id: stallId,
      p_menu_item_id: itemId,
      p_quantity: qty
    })

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_zaika_purchase', {
        p_buyer_id: profile.id,
        p_stall_id: stallId,
        p_menu_item_id: itemId,
        p_quantity: qty
      })

      if (error) {
        console.error('[createPurchase] RPC error:', error)
        throw error
      }
      
      console.log('[createPurchase] Success, transaction ID:', data)
      // Refresh both pending transactions AND wallet (balance was deducted)
      await fetchPendingTransactions()
      return data
    } finally {
      setLoading(false)
    }
  }, [profile?.id, supabase, fetchPendingTransactions])

  const cancelTransaction = useCallback(async (transactionId) => {
    if (!supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('cancel_zaika_transaction', {
      p_transaction_id: transactionId
    })

    if (error) throw error
    await fetchPendingTransactions()
    await fetchOrderHistory()
    return data
  }, [supabase, fetchPendingTransactions, fetchOrderHistory])

  useEffect(() => {
    fetchPendingTransactions()
    fetchOrderHistory()
  }, [fetchPendingTransactions, fetchOrderHistory])

  // Real-time subscription for transaction updates
  useEffect(() => {
    if (!profile?.id || !supabase) return

    const channel = supabase
      .channel('my-transactions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zaika_transactions',
        filter: `buyer_profile_id=eq.${profile.id}`
      }, () => {
        fetchPendingTransactions()
        fetchOrderHistory()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [profile?.id, supabase, fetchPendingTransactions, fetchOrderHistory])

  return {
    pendingTransactions,
    orderHistory,
    loading,
    createPurchase,
    cancelTransaction,
    refresh: () => Promise.all([fetchPendingTransactions(), fetchOrderHistory()]),
  }
}

/**
 * Hook for leaderboard
 */
export function useZaikaLeaderboard() {
  const { supabase } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase.rpc('get_zaika_leaderboard')

      if (error) throw error
      setLeaderboard(data || [])
    } catch (err) {
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  return {
    leaderboard,
    loading,
    refresh: fetchLeaderboard,
  }
}

/**
 * Hook for admin/coordinator operations
 */
export function useZaikaAdmin() {
  const { supabase, profile } = useAuth()
  const [pendingTopups, setPendingTopups] = useState([])
  const [topupHistory, setTopupHistory] = useState([])
  const [allTransactions, setAllTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  // Debug: log auth state
  console.log('useZaikaAdmin - profile:', profile?.id, 'role:', profile?.role, 'supabase:', !!supabase)

  const fetchPendingTopups = useCallback(async () => {
    if (!supabase) {
      console.log('Supabase client not available')
      return
    }

    try {
      console.log('Fetching pending topups...')
      
      // First try with join
      const { data, error } = await supabase
        .from('zaika_topup_requests')
        .select(`
          *,
          profile:profiles!zaika_topup_requests_profile_id_fkey(full_name, roll_number, college_email)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching pending topups with join:', error)
        
        // Fallback: fetch without join, then manually fetch profiles
        console.log('Trying fallback without join...')
        const { data: requestsOnly, error: reqError } = await supabase
          .from('zaika_topup_requests')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
        
        if (reqError) {
          console.error('Fallback also failed:', reqError)
          throw reqError
        }
        
        // Manually fetch profiles for each request
        if (requestsOnly && requestsOnly.length > 0) {
          const profileIds = [...new Set(requestsOnly.map(r => r.profile_id))]
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, roll_number, college_email')
            .in('id', profileIds)
          
          const profileMap = (profiles || []).reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {})
          
          const enrichedData = requestsOnly.map(r => ({
            ...r,
            profile: profileMap[r.profile_id] || null
          }))
          
          console.log('Pending topups (via fallback):', enrichedData)
          setPendingTopups(enrichedData)
          return
        }
        
        setPendingTopups(requestsOnly || [])
        return
      }
      
      console.log('Pending topups fetched:', data)
      setPendingTopups(data || [])
    } catch (err) {
      console.error('Error fetching pending topups:', err)
      setPendingTopups([])
    }
  }, [supabase])

  const fetchTopupHistory = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_topup_requests')
        .select(`
          *,
          profile:profiles!zaika_topup_requests_profile_id_fkey(full_name, roll_number, college_email)
        `)
        .in('status', ['approved', 'rejected'])
        .order('updated_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching topup history:', error)
        // Fallback without join
        const { data: historyOnly, error: histError } = await supabase
          .from('zaika_topup_requests')
          .select('*')
          .in('status', ['approved', 'rejected'])
          .order('updated_at', { ascending: false })
          .limit(100)

        if (histError) throw histError

        if (historyOnly && historyOnly.length > 0) {
          const profileIds = [...new Set(historyOnly.map(r => r.profile_id))]
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, roll_number, college_email')
            .in('id', profileIds)

          const profileMap = (profiles || []).reduce((acc, p) => {
            acc[p.id] = p
            return acc
          }, {})

          const enrichedData = historyOnly.map(r => ({
            ...r,
            profile: profileMap[r.profile_id] || null
          }))

          setTopupHistory(enrichedData)
          return
        }

        setTopupHistory(historyOnly || [])
        return
      }

      setTopupHistory(data || [])
    } catch (err) {
      console.error('Error fetching topup history:', err)
      setTopupHistory([])
    }
  }, [supabase])

  const fetchAllTransactions = useCallback(async () => {
    if (!supabase) return

    try {
      const { data, error } = await supabase
        .from('zaika_transactions')
        .select(`
          *,
          buyer:profiles!zaika_transactions_buyer_profile_id_fkey(full_name, roll_number),
          stall:zaika_stalls(stall_number, stall_name)
        `)
        .order('created_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setAllTransactions(data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
    }
  }, [supabase])

  const approveTopup = useCallback(async (requestId) => {
    if (!profile?.id || !supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('approve_zaika_topup', {
      request_id: requestId,
      approver_id: profile.id
    })

    if (error) throw error
    await fetchPendingTopups()
    return data
  }, [profile?.id, supabase, fetchPendingTopups])

  const rejectTopup = useCallback(async (requestId, reason = null) => {
    if (!profile?.id || !supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase.rpc('reject_zaika_topup', {
      request_id: requestId,
      rejector_id: profile.id,
      reason: reason
    })

    if (error) throw error
    await fetchPendingTopups()
    return data
  }, [profile?.id, supabase, fetchPendingTopups])

  // Close all stalls at once (admin only)
  const closeAllStalls = useCallback(async () => {
    if (!supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('zaika_stalls')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Match all records
      .select()

    if (error) throw error
    return data
  }, [supabase])

  // Open all stalls at once (admin only)
  const openAllStalls = useCallback(async () => {
    if (!supabase) throw new Error('Not authenticated')

    const { data, error } = await supabase
      .from('zaika_stalls')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .neq('id', '00000000-0000-0000-0000-000000000000') // Match all records
      .select()

    if (error) throw error
    return data
  }, [supabase])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      await Promise.all([fetchPendingTopups(), fetchTopupHistory(), fetchAllTransactions()])
      setLoading(false)
    }
    load()
  }, [fetchPendingTopups, fetchTopupHistory, fetchAllTransactions])

  // Real-time subscription for new topup requests
  useEffect(() => {
    if (!supabase) return

    const channel = supabase
      .channel('admin-topups')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'zaika_topup_requests'
      }, () => {
        fetchPendingTopups()
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'zaika_topup_requests'
      }, () => {
        fetchPendingTopups()
        fetchTopupHistory()
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'zaika_transactions'
      }, () => {
        fetchAllTransactions()
      })
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [supabase, fetchPendingTopups, fetchTopupHistory, fetchAllTransactions])

  return {
    pendingTopups,
    topupHistory,
    allTransactions,
    loading,
    approveTopup,
    rejectTopup,
    closeAllStalls,
    openAllStalls,
    refresh: () => Promise.all([fetchPendingTopups(), fetchTopupHistory(), fetchAllTransactions()]),
  }
}
