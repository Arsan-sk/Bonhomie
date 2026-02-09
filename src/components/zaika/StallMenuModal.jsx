/**
 * StallMenuModal - Modal for viewing stall menu and placing orders
 */

import { useState } from 'react'
import { X, Store, Minus, Plus, ShoppingCart, Wallet, AlertCircle, UtensilsCrossed } from 'lucide-react'
import { formatCurrency } from '../../utils/zaikaConfig'
import { useZaikaPurchase, useZaikaWallet } from '../../hooks/useZaika'

export default function StallMenuModal({ isOpen, onClose, stall, menuItems = [] }) {
  const [selectedItem, setSelectedItem] = useState(null)
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const { wallet, refresh: refreshWallet } = useZaikaWallet()
  const { createPurchase } = useZaikaPurchase()

  if (!isOpen) return null

  const totalAmount = selectedItem ? selectedItem.price * quantity : 0
  const hasEnoughBalance = wallet && wallet.balance >= totalAmount

  const handleSelectItem = (item) => {
    setSelectedItem(item)
    setQuantity(1)
    setError('')
    setSuccess(false)
  }

  const handleQuantityChange = (delta) => {
    setQuantity(prev => Math.max(1, Math.min(10, prev + delta)))
  }

  const handlePurchase = async () => {
    if (!selectedItem) return
    
    setError('')
    setLoading(true)

    try {
      // Pass arguments separately: stallId, menuItemId, quantity
      await createPurchase(stall.stall_id || stall.id, selectedItem.id, quantity)
      // Refresh wallet to show updated balance immediately
      await refreshWallet()
      setSuccess(true)
      setTimeout(() => {
        onClose()
        setSelectedItem(null)
        setQuantity(1)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err.message || 'Failed to place order')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedItem(null)
    setQuantity(1)
    setError('')
    setSuccess(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-scaleIn">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-orange-500 to-amber-500 rounded-t-2xl text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Store className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{stall.stall_name}</h2>
              <p className="text-orange-100 text-sm">by {stall.team_name || 'Team'}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto p-4">
          {menuItems.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No items available</p>
          ) : (
            <div className="space-y-2">
              {menuItems.filter(item => item.is_available).map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectItem(item)}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border transition-all ${
                    selectedItem?.id === item.id
                      ? 'border-orange-500 bg-orange-50 ring-2 ring-orange-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {/* Item Image */}
                  {item.image_url ? (
                    <img 
                      src={item.image_url} 
                      alt={item.name}
                      className="h-16 w-16 object-cover rounded-lg flex-shrink-0"
                      onError={(e) => { e.target.style.display = 'none' }}
                    />
                  ) : (
                    <div className="h-16 w-16 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UtensilsCrossed className="h-6 w-6 text-orange-400" />
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
                    )}
                  </div>
                  <span className="text-lg font-bold text-orange-600 ml-4 flex-shrink-0">
                    {formatCurrency(item.price)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Order Section */}
        {selectedItem && (
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            {/* Success Message */}
            {success ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="h-8 w-8 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-700">Order Placed!</p>
                <p className="text-sm text-green-600">Wait for the stall to prepare your order</p>
              </div>
            ) : (
              <>
                {/* Selected Item & Quantity */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium text-gray-900">{selectedItem.name}</p>
                    <p className="text-sm text-gray-500">{formatCurrency(selectedItem.price)} each</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(-1)}
                      className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(1)}
                      className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-100 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Balance Info */}
                <div className="flex items-center justify-between mb-4 p-3 bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">Your Balance</span>
                  </div>
                  <span className={`font-semibold ${hasEnoughBalance ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(wallet?.balance || 0)}
                  </span>
                </div>

                {/* Error / Insufficient Balance */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    {error}
                  </div>
                )}

                {!hasEnoughBalance && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-700 text-sm flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Insufficient balance. Please add money to your wallet.
                  </div>
                )}

                {/* Total & Order Button */}
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">Total Amount</p>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalAmount)}</p>
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={loading || !hasEnoughBalance}
                    className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <ShoppingCart className="h-5 w-5" />
                    {loading ? 'Placing...' : 'Place Order'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
