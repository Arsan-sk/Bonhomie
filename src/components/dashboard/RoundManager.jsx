import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { Plus, Trash2, Save, Loader2, Users } from 'lucide-react'

export default function RoundManager({ eventId }) {
    const [rounds, setRounds] = useState([])
    const [loading, setLoading] = useState(true)
    const [newRoundName, setNewRoundName] = useState('')
    const [adding, setAdding] = useState(false)

    useEffect(() => {
        fetchRounds()
    }, [eventId])

    const fetchRounds = async () => {
        try {
            const { data, error } = await supabase
                .from('rounds')
                .select('*')
                .eq('event_id', eventId)
                .order('created_at', { ascending: true })

            if (error) throw error
            setRounds(data || [])
        } catch (error) {
            console.error('Error fetching rounds:', error)
        } finally {
            setLoading(false)
        }
    }

    const addRound = async () => {
        if (!newRoundName) return
        setAdding(true)
        try {
            const { data, error } = await supabase
                .from('rounds')
                .insert({
                    event_id: eventId,
                    round_name: newRoundName,
                    status: 'pending'
                })
                .select()
                .single()

            if (error) throw error
            setRounds([...rounds, data])
            setNewRoundName('')
        } catch (error) {
            console.error('Error adding round:', error)
        } finally {
            setAdding(false)
        }
    }

    const deleteRound = async (id) => {
        if (!confirm('Are you sure? This will remove all qualifiers for this round.')) return
        try {
            const { error } = await supabase
                .from('rounds')
                .delete()
                .eq('id', id)
            if (error) throw error
            setRounds(rounds.filter(r => r.id !== id))
        } catch (error) {
            console.error('Error deleting round:', error)
        }
    }

    if (loading) return <Loader2 className="animate-spin h-5 w-5 text-gray-500" />

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900">Event Rounds</h3>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={newRoundName}
                    onChange={(e) => setNewRoundName(e.target.value)}
                    placeholder="New Round Name (e.g. Semi-Finals)"
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                />
                <button
                    type="button"
                    onClick={addRound}
                    disabled={adding || !newRoundName}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-blue-700 disabled:opacity-50"
                >
                    {adding ? <Loader2 className="animate-spin h-4 w-4" /> : <Plus className="h-4 w-4 mr-1" />}
                    Add
                </button>
            </div>

            <ul className="divide-y divide-gray-200 bg-gray-50 rounded-md border border-gray-200">
                {rounds.map((round) => (
                    <li key={round.id} className="px-4 py-3 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-900">{round.round_name}</p>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${round.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    round.status === 'active' ? 'bg-blue-100 text-blue-800' :
                                        'bg-gray-100 text-gray-800'}`}
                            >
                                {round.status}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-1 text-gray-400 hover:text-blue-600" title="Manage Qualifiers">
                                <Users className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => deleteRound(round.id)}
                                className="p-1 text-gray-400 hover:text-red-600"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </li>
                ))}
                {rounds.length === 0 && (
                    <li className="px-4 py-8 text-center text-gray-500 text-sm">
                        No rounds defined yet.
                    </li>
                )}
            </ul>
        </div>
    )
}
