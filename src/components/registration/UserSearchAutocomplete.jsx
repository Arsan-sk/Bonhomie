import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Search, X, UserPlus } from 'lucide-react'

export default function UserSearchAutocomplete({ onSelect, excludeIds = [], currentUserId }) {
    const [query, setQuery] = useState('')
    const [results, setResults] = useState([])
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (query.length < 2) {
            setResults([])
            return
        }

        const timer = setTimeout(() => {
            searchUsers()
        }, 300) // Debounce 300ms

        return () => clearTimeout(timer)
    }, [query, excludeIds])

    const searchUsers = async () => {
        setLoading(true)
        try {
            // Build exclude list
            const excludeList = [currentUserId, ...excludeIds].filter(Boolean)

            let query_builder = supabase
                .from('profiles')
                .select('id, full_name, college_email, roll_number, department, year_of_study')
                .or(`college_email.ilike.%${query}%,roll_number.ilike.%${query}%`)
                .limit(10)

            // Exclude current user and already selected members
            if (excludeList.length > 0) {
                query_builder = query_builder.not('id', 'in', `(${excludeList.join(',')})`)
            }

            const { data, error } = await query_builder

            if (!error) setResults(data || [])
        } catch (err) {
            console.error('Search error:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleSelect = (user) => {
        onSelect(user)
        setQuery('')
        setResults([])
    }

    return (
        <div className="relative">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by email or roll number..."
                    className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                    >
                        <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                    </button>
                )}
            </div>

            {results.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {results.map(user => (
                        <button
                            key={user.id}
                            type="button"
                            onClick={() => handleSelect(user)}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 flex items-center gap-3"
                        >
                            <UserPlus className="h-4 w-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{user.full_name}</p>
                                <p className="text-xs text-gray-500 truncate">
                                    {user.roll_number} • {user.department} • {user.year_of_study}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{user.college_email}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {loading && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
                    Searching...
                </div>
            )}
        </div>
    )
}
