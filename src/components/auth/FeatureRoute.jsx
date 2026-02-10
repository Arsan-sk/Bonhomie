/**
 * FeatureRoute - Wrapper component that checks if a feature is active
 * Renders children if feature is active, otherwise redirects to 404
 */

import { Navigate } from 'react-router-dom'
import { useFeatureFlags } from '../../context/FeatureFlagsContext'

/**
 * Route guard that checks if a feature is enabled
 * @param {Object} props
 * @param {string} props.featureKey - The feature key to check (e.g., 'chat', 'zaika')
 * @param {React.ReactNode} props.children - The component to render if feature is active
 * @param {string} [props.fallbackPath] - Path to redirect to if feature is inactive (default: shows 404)
 */
export default function FeatureRoute({ featureKey, children, fallbackPath = null }) {
  const { isFeatureActive, loading } = useFeatureFlags()

  // While loading, show nothing to avoid flash of content
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  // Check if feature is active
  if (!isFeatureActive(featureKey)) {
    // If fallback path provided, redirect there
    if (fallbackPath) {
      return <Navigate to={fallbackPath} replace />
    }
    // Otherwise, go to 404
    return <Navigate to="/404" replace />
  }

  // Feature is active, render children
  return children
}
