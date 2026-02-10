/**
 * FeatureFlagsContext - Provides feature flags throughout the application
 * Controls which features are active/visible based on database configuration
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const FeatureFlagsContext = createContext({
  flags: {},
  loading: true,
  isFeatureActive: () => false,
  refresh: async () => {},
})

export function FeatureFlagsProvider({ children }) {
  const [flags, setFlags] = useState({})
  const [loading, setLoading] = useState(true)

  const fetchFlags = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('feature_key, is_active')

      if (error) {
        console.error('Error fetching feature flags:', error)
        // Default to all features active if fetch fails
        return
      }

      // Convert array to object for easy lookup
      const flagsMap = {}
      data?.forEach(flag => {
        flagsMap[flag.feature_key] = flag.is_active
      })

      console.log('[FeatureFlags] Loaded flags:', flagsMap)
      setFlags(flagsMap)
    } catch (err) {
      console.error('Error in fetchFlags:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchFlags()
  }, [fetchFlags])

  // Real-time subscription for flag changes
  useEffect(() => {
    const channel = supabase
      .channel('feature-flags-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'feature_flags' },
        (payload) => {
          console.log('[FeatureFlags] Real-time update:', payload)
          fetchFlags()
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [fetchFlags])

  /**
   * Check if a feature is active
   * @param {string} featureKey - The feature key to check (e.g., 'chat', 'zaika')
   * @returns {boolean} - True if feature is active, false otherwise
   */
  const isFeatureActive = useCallback((featureKey) => {
    // If still loading or flag not found, default to true (feature active)
    // This ensures features work by default until explicitly disabled
    if (loading) return true
    if (flags[featureKey] === undefined) return true
    return flags[featureKey]
  }, [flags, loading])

  const value = {
    flags,
    loading,
    isFeatureActive,
    refresh: fetchFlags,
  }

  return (
    <FeatureFlagsContext.Provider value={value}>
      {children}
    </FeatureFlagsContext.Provider>
  )
}

/**
 * Hook to access feature flags
 * @returns {{ flags: Object, loading: boolean, isFeatureActive: (key: string) => boolean, refresh: () => Promise<void> }}
 */
export function useFeatureFlags() {
  const context = useContext(FeatureFlagsContext)
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagsProvider')
  }
  return context
}

export default FeatureFlagsContext
