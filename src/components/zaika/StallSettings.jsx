/**
 * StallSettings - Component for stall owners to update their stall settings
 */

import { useState } from 'react'
import { Settings, Save, Power, AlertCircle } from 'lucide-react'

export default function StallSettings({ stall, onUpdate }) {
  const [stallName, setStallName] = useState(stall?.stall_name || '')
  const [isActive, setIsActive] = useState(stall?.is_active ?? true)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!stallName.trim()) {
      setError('Stall name is required')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      await onUpdate({
        stall_name: stallName.trim(),
        is_active: isActive
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  const toggleStallStatus = async () => {
    setLoading(true)
    setError('')
    
    try {
      await onUpdate({ is_active: !isActive })
      setIsActive(!isActive)
    } catch (err) {
      setError(err.message || 'Failed to update status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Quick Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isActive ? 'bg-green-100' : 'bg-gray-100'}`}>
              <Power className={`h-5 w-5 ${isActive ? 'text-green-600' : 'text-gray-500'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Stall Status</h3>
              <p className="text-sm text-gray-500">
                {isActive ? 'Your stall is open for orders' : 'Your stall is closed'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleStallStatus}
            disabled={loading}
            className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors ${
              isActive ? 'bg-green-500' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                isActive ? 'translate-x-8' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-6">
          <Settings className="h-5 w-5 text-orange-500" />
          Stall Settings
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Stall Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stall Name
            </label>
            <input
              type="text"
              value={stallName}
              onChange={(e) => setStallName(e.target.value)}
              placeholder="Enter your stall name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              This name will be visible to all buyers
            </p>
          </div>

          {/* Team Info (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Team
            </label>
            <input
              type="text"
              value={stall?.team_name || 'Your Team'}
              disabled
              className="w-full px-4 py-3 border border-gray-200 bg-gray-50 rounded-lg text-gray-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Team name from your Zaika registration
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              Settings saved successfully!
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </div>

      {/* Info */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
        <h4 className="font-medium text-orange-900 mb-2">Tips for your stall</h4>
        <ul className="text-sm text-orange-800 space-y-1.5">
          <li>• Choose a catchy name that describes your food</li>
          <li>• Close your stall if you run out of items</li>
          <li>• Add clear descriptions to your menu items</li>
          <li>• Price your items competitively</li>
        </ul>
      </div>
    </div>
  )
}
