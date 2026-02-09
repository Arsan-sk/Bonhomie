/**
 * ZaikaMain - Entry point for Zaika Food Festival
 * Determines if user is a stall owner or buyer and renders appropriate dashboard
 */

import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { useZaika } from '../../hooks/useZaika'
import { Loader2, Store, ShoppingBag, AlertCircle, Utensils } from 'lucide-react'
import BuyerDashboard from './BuyerDashboard'
import StallDashboard from './StallDashboard'

export default function ZaikaMain() {
  const { profile } = useAuth()
  const { loading, isStallOwner, stallData, walletData, error, refresh } = useZaika()

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-orange-500 mb-4" />
        <p className="text-gray-600">Loading Zaika...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Please login</h2>
        <p className="text-gray-600">You need to be logged in to access Zaika.</p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Utensils className="h-6 w-6 text-orange-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Zaika Food Festival</h1>
        </div>
        <p className="text-gray-600">
          {isStallOwner 
            ? 'Manage your food stall, menu items, and incoming orders'
            : 'Browse food stalls, add money to your wallet, and order delicious food!'
          }
        </p>
      </div>

      {/* Role Badge */}
      <div className="mb-6">
        {isStallOwner ? (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-800 rounded-full">
            <Store className="h-4 w-4" />
            <span className="font-medium">Stall Owner</span>
            {stallData && (
              <span className="text-purple-600">• Stall #{stallData.stall_number}</span>
            )}
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full">
            <ShoppingBag className="h-4 w-4" />
            <span className="font-medium">Food Buyer</span>
            {walletData && (
              <span className="text-green-600">• Balance: ₹{walletData.balance || 0}</span>
            )}
          </div>
        )}
      </div>

      {/* Render appropriate dashboard */}
      {isStallOwner ? (
        <StallDashboard stallData={stallData} />
      ) : (
        <BuyerDashboard walletData={walletData} />
      )}
    </div>
  )
}
