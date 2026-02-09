/**
 * Zaika Food Festival Configuration
 * Central configuration for the Zaika digital wallet system
 */

// Direct exports for easy importing
export const MIN_TOPUP_AMOUNT = 50
export const QUICK_TOPUP_AMOUNTS = [50, 100, 200, 500]
export const EVENT_NAME = 'Zaika'

export const ZAIKA_CONFIG = {
  // Minimum amount for wallet top-up (in rupees)
  MIN_TOPUP_AMOUNT,
  
  // Quick select amounts for top-up
  QUICK_TOPUP_AMOUNTS,
  
  // Event name in database (case-insensitive match)
  EVENT_NAME,
  
  // Transaction statuses
  TRANSACTION_STATUS: {
    PENDING: 'pending',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REJECTED: 'rejected',
  },
  
  // Top-up request statuses
  TOPUP_STATUS: {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
  },
  
  // UI Labels
  LABELS: {
    WALLET: 'My Wallet',
    STALLS: 'Food Stalls',
    PENDING: 'Pending Orders',
    PAYMENTS: 'Incoming Orders',
    MENU: 'My Menu',
    SALES: 'Sales History',
    SETTINGS: 'Stall Settings',
  },
}

// Status badge colors
export const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  rejected: 'bg-red-100 text-red-800',
  approved: 'bg-green-100 text-green-800',
}

// Format currency in Indian Rupees
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0)
}
