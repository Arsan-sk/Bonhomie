/**
 * MenuManagement - Component for stall owners to manage their menu items
 */

import { useState } from 'react'
import { Plus, Edit2, Trash2, Check, X, UtensilsCrossed, Image } from 'lucide-react'
import { formatCurrency } from '../../utils/zaikaConfig'
import { supabase } from '../../lib/supabase'

export default function MenuManagement({ stall, menu = [], onUpdate }) {
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [formData, setFormData] = useState({ name: '', description: '', price: '', image_url: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Get stall ID - support both formats
  const stallId = stall?.stall_id || stall?.id
  
  // Debug log
  console.log('MenuManagement stall:', { stall, stallId })

  const resetForm = () => {
    setFormData({ name: '', description: '', price: '', image_url: '' })
    setIsAdding(false)
    setEditingId(null)
    setError('')
  }

  const handleAdd = async () => {
    if (!formData.name || !formData.price) {
      setError('Name and price are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Use RPC function instead of direct table insert (handles RLS properly)
      if (!stallId) {
        throw new Error('Stall ID not found. Please refresh the page.')
      }
      
      console.log('Adding menu item to stall:', stallId)
      
      const { data, error: insertError } = await supabase.rpc('zaika_add_menu_item', {
        p_stall_id: stallId,
        p_name: formData.name.trim(),
        p_price: parseFloat(formData.price),
        p_description: formData.description.trim() || null,
        p_image_url: formData.image_url.trim() || null
      })

      if (insertError) throw insertError
      resetForm()
      onUpdate?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = async (itemId) => {
    if (!formData.name || !formData.price) {
      setError('Name and price are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      // Use RPC function instead of direct table update (handles RLS properly)
      const { error: updateError } = await supabase.rpc('zaika_update_menu_item', {
        p_item_id: itemId,
        p_name: formData.name.trim(),
        p_price: parseFloat(formData.price),
        p_description: formData.description.trim() || null,
        p_image_url: formData.image_url.trim() || null
      })

      if (updateError) throw updateError
      resetForm()
      onUpdate?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return

    setLoading(true)
    try {
      // Use RPC function instead of direct table delete (handles RLS properly)
      const { error: deleteError } = await supabase.rpc('zaika_delete_menu_item', {
        p_item_id: itemId
      })

      if (deleteError) throw deleteError
      onUpdate?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleAvailability = async (item) => {
    try {
      // Use RPC function instead of direct table update (handles RLS properly)
      const { error: updateError } = await supabase.rpc('zaika_toggle_menu_item_availability', {
        p_item_id: item.id
      })

      if (updateError) throw updateError
      onUpdate?.()
    } catch (err) {
      setError(err.message)
    }
  }

  const startEdit = (item) => {
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      image_url: item.image_url || ''
    })
    setEditingId(item.id)
    setIsAdding(false)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <UtensilsCrossed className="h-5 w-5 text-orange-500" />
          Menu Items ({menu.length})
        </h3>
        {!isAdding && !editingId && (
          <button
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:from-orange-600 hover:to-amber-600 transition-all"
          >
            <Plus className="h-4 w-4" />
            Add Item
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add Form */}
      {isAdding && (
        <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3">Add New Item</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Item name *"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <input
              type="number"
              placeholder="Price (₹) *"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <input
              type="text"
              placeholder="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            />
            <div className="relative">
              <input
                type="url"
                placeholder="Image URL (optional)"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
              <Image className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>
          {formData.image_url && (
            <div className="mt-3 p-2 bg-white rounded-lg border border-gray-200">
              <p className="text-xs text-gray-500 mb-2">Image Preview:</p>
              <img 
                src={formData.image_url} 
                alt="Preview" 
                className="h-20 w-20 object-cover rounded-lg"
                onError={(e) => { e.target.style.display = 'none' }}
              />
            </div>
          )}
          <div className="flex gap-2 mt-3">
            <button
              onClick={handleAdd}
              disabled={loading}
              className="flex items-center gap-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              <Check className="h-4 w-4" />
              {loading ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={resetForm}
              className="flex items-center gap-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Menu List */}
      {menu.length === 0 && !isAdding ? (
        <div className="text-center py-8">
          <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No menu items yet</p>
          <p className="text-sm text-gray-400">Add your first item to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {menu.map((item) => (
            <div
              key={item.id}
              className={`flex items-center justify-between p-4 rounded-lg border ${
                item.is_available ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'
              }`}
            >
              {editingId === item.id ? (
                // Edit Mode
                <div className="flex-1 mr-4">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Item name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="number"
                      placeholder="Price (₹)"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="text"
                      placeholder="Description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      type="url"
                      placeholder="Image URL"
                      value={formData.image_url}
                      onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                  {formData.image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.image_url} 
                        alt="Preview" 
                        className="h-16 w-16 object-cover rounded-lg"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleUpdate(item.id)}
                      disabled={loading}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600"
                    >
                      <Check className="h-3 w-3" />
                      Save
                    </button>
                    <button
                      onClick={resetForm}
                      className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50"
                    >
                      <X className="h-3 w-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View Mode
                <>
                  <div className="flex items-center gap-4 flex-1">
                    {item.image_url ? (
                      <img 
                        src={item.image_url} 
                        alt={item.name}
                        className="h-14 w-14 object-cover rounded-lg flex-shrink-0"
                        onError={(e) => { e.target.style.display = 'none' }}
                      />
                    ) : (
                      <div className="h-14 w-14 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <UtensilsCrossed className="h-6 w-6 text-orange-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${item.is_available ? 'text-gray-900' : 'text-gray-400'}`}>
                          {item.name}
                      </p>
                      {!item.is_available && (
                        <span className="px-2 py-0.5 bg-gray-200 text-gray-500 text-xs rounded-full">
                          Unavailable
                        </span>
                      )}
                    </div>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-lg font-bold text-orange-600">
                      {formatCurrency(item.price)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleAvailability(item)}
                        className={`p-2 rounded-lg transition-colors ${
                          item.is_available
                            ? 'text-green-600 hover:bg-green-50'
                            : 'text-gray-400 hover:bg-gray-100'
                        }`}
                        title={item.is_available ? 'Mark unavailable' : 'Mark available'}
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEdit(item)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
