/**
 * PendingRequestCard - Card for showing pending top-up or order requests
 */

import { Clock, X, Store, UtensilsCrossed } from 'lucide-react'
import { formatCurrency } from '../../utils/zaikaConfig'

export default function PendingRequestCard({ transaction, onCancel }) {
  const isPending = transaction.status === 'pending'

  return (
    <div className={`bg-white rounded-xl shadow-sm border p-4 ${
      isPending ? 'border-amber-200 bg-amber-50/50' : 'border-gray-200'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${isPending ? 'bg-amber-100' : 'bg-gray-100'}`}>
            <Store className={`h-5 w-5 ${isPending ? 'text-amber-600' : 'text-gray-500'}`} />
          </div>
          <div>
            {/* Stall info with stall number */}
            <div className="flex items-center gap-2">
              <p className="font-semibold text-gray-900">
                {transaction.stall?.stall_name || 'Stall'}
              </p>
              {transaction.stall?.stall_number && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Stall #{transaction.stall.stall_number}
                </span>
              )}
            </div>
            
            {/* Food item ordered */}
            <div className="flex items-center gap-2 mt-1">
              <UtensilsCrossed className="h-3.5 w-3.5 text-gray-400" />
              <p className="text-sm text-gray-700 font-medium">
                {transaction.item_name || 'Unknown Item'}
                {transaction.quantity > 1 && (
                  <span className="ml-1 text-gray-500">x{transaction.quantity}</span>
                )}
              </p>
            </div>
            
            {/* Timestamp */}
            <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
              <Clock className="h-3 w-3" />
              <span>{new Date(transaction.created_at).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <p className="text-xl font-bold text-orange-600">{formatCurrency(transaction.total_amount || 0)}</p>
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${
            isPending 
              ? 'bg-amber-100 text-amber-700'
              : transaction.status === 'completed'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
          }`}>
            {isPending && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>}
            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
          </span>
        </div>
      </div>

      {/* Cancel Button (only for pending) */}
      {isPending && onCancel && (
        <button
          onClick={onCancel}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <X className="h-4 w-4" />
          Cancel Order
        </button>
      )}
    </div>
  )
}
