/**
 * AddMoneyModal - Modal for adding money to wallet via cash at counter
 */

import { useState } from 'react'
import { X, Wallet, AlertCircle } from 'lucide-react'
import { MIN_TOPUP_AMOUNT, QUICK_TOPUP_AMOUNTS, formatCurrency } from '../../utils/zaikaConfig'

export default function AddMoneyModal({ isOpen, onClose, onSubmit }) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleQuickAmount = (value) => {
    setAmount(value.toString())
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount < MIN_TOPUP_AMOUNT) {
      setError(`Minimum top-up amount is ${formatCurrency(MIN_TOPUP_AMOUNT)}`)
      return
    }

    setLoading(true)
    try {
      await onSubmit(numAmount)
      setAmount('')
    } catch (err) {
      setError(err.message || 'Failed to create top-up request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Wallet className="h-5 w-5 text-orange-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Add Money</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info Banner */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">Cash Payment at Counter</p>
                <p className="text-amber-700 mt-1">
                  Submit your top-up request, then pay cash at the registration counter. 
                  Your wallet will be credited once approved.
                </p>
              </div>
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quick Select
            </label>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_TOPUP_AMOUNTS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handleQuickAmount(value)}
                  className={`py-2 px-3 text-sm font-medium rounded-lg border transition-all ${
                    parseInt(amount) === value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  ₹{value}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Or Enter Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                ₹
              </span>
              <input
                type="number"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError('')
                }}
                placeholder="Enter amount"
                min={MIN_TOPUP_AMOUNT}
                step="10"
                className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-lg"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              Minimum: {formatCurrency(MIN_TOPUP_AMOUNT)}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !amount}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Submitting...' : 'Request Top-up'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
