/**
 * StallCard - Display card for a food stall with menu preview
 * Clickable card with gradient header
 */

import { useState } from 'react'
import { Store, Clock } from 'lucide-react'
import { formatCurrency } from '../../utils/zaikaConfig'
import StallMenuModal from './StallMenuModal'

export default function StallCard({ stall }) {
  const [showMenu, setShowMenu] = useState(false)

  const menuItems = stall.menu_items || []
  const previewItems = menuItems.slice(0, 3)
  const hasMoreItems = menuItems.length > 3

  const handleClick = () => {
    if (stall.is_active) {
      setShowMenu(true)
    }
  }

  return (
    <>
      <div 
        onClick={handleClick}
        className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden transition-all ${
          stall.is_active 
            ? 'hover:shadow-md hover:border-orange-200 cursor-pointer' 
            : 'opacity-70 cursor-not-allowed'
        }`}
      >
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Store className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-lg truncate">{stall.stall_name}</h3>
              <p className="text-orange-100 text-sm truncate">
                by {stall.team_name || 'Team'}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Status */}
          <div className="flex items-center gap-2 mb-3">
            {stall.is_active ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Open
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                <Clock className="h-3 w-3" />
                Closed
              </span>
            )}
            <span className="text-sm text-gray-500">
              {menuItems.length} item{menuItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Menu Preview */}
          {menuItems.length === 0 ? (
            <p className="text-sm text-gray-400 italic py-2">No menu items yet</p>
          ) : (
            <div className="space-y-2">
              {previewItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 truncate flex-1">{item.name}</span>
                  <span className="text-gray-900 font-medium ml-2">
                    {formatCurrency(item.price)}
                  </span>
                </div>
              ))}
              {hasMoreItems && (
                <p className="text-xs text-gray-400">
                  +{menuItems.length - 3} more item{menuItems.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Tap to view hint */}
          {stall.is_active && (
            <p className="text-xs text-center text-orange-500 mt-4 font-medium">
              Tap to view menu
            </p>
          )}
        </div>
      </div>

      {/* Menu Modal */}
      <StallMenuModal
        isOpen={showMenu}
        onClose={() => setShowMenu(false)}
        stall={stall}
        menuItems={menuItems}
      />
    </>
  )
}