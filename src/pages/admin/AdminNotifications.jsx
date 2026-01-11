import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Send, Loader2, Users, User, Bell, Info, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import clsx from 'clsx'

export default function AdminNotifications() {
    const [formData, setFormData] = useState({
        scope: 'broadcast', // 'broadcast' or 'individual'
        recipient_email: '',
        message: '',
        type: 'info'
    })
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            if (formData.scope === 'broadcast') {
                const { data: users, error: userError } = await supabase.from('profiles').select('id')
                if (userError) throw userError

                const notifications = users.map(u => ({
                    user_id: u.id,
                    message: formData.message,
                    type: formData.type,
                    read_status: false
                }))

                const { error } = await supabase.from('notifications').insert(notifications)
                if (error) throw error
                alert(`Broadcast sent to ${users.length} users.`)
            } else {
                const { data: user, error: userError } = await supabase.from('profiles').select('id').eq('email', formData.recipient_email).single()
                if (userError || !user) throw new Error('User not found')

                const { error } = await supabase.from('notifications').insert([{
                    user_id: user.id,
                    message: formData.message,
                    type: formData.type,
                    read_status: false
                }])
                if (error) throw error
                alert('Notification sent.')
            }
            setFormData({ ...formData, message: '', recipient_email: '' })
        } catch (error) {
            alert(error.message || 'Failed to send')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Notifications Center</h2>
                    <p className="mt-1 text-sm text-gray-500">Send broadcasts or individual alerts to users.</p>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 space-y-6">
                    {/* Scope Selection */}
                    <div>
                        <label className="text-sm font-medium text-gray-900 mb-3 block">Recipient Scope</label>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, scope: 'broadcast' })}
                                className={clsx(
                                    "relative flex items-center justify-center gap-3 px-4 py-4 rounded-lg border-2 transition-all",
                                    formData.scope === 'broadcast'
                                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                                )}
                            >
                                <Users className="h-5 w-5" />
                                <span className="font-medium">Broadcast All</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, scope: 'individual' })}
                                className={clsx(
                                    "relative flex items-center justify-center gap-3 px-4 py-4 rounded-lg border-2 transition-all",
                                    formData.scope === 'individual'
                                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                                        : "border-gray-200 hover:border-gray-300 text-gray-600"
                                )}
                            >
                                <User className="h-5 w-5" />
                                <span className="font-medium">Individual User</span>
                            </button>
                        </div>
                    </div>

                    {/* Email Input */}
                    {formData.scope === 'individual' && (
                        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                            <label className="text-sm font-medium text-gray-900 mb-1.5 block">Recipient Email</label>
                            <input
                                type="email"
                                required
                                value={formData.recipient_email}
                                onChange={e => setFormData({ ...formData, recipient_email: e.target.value })}
                                className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                                placeholder="user@example.com"
                            />
                        </div>
                    )}

                    {/* Type Selection */}
                    <div>
                        <label className="text-sm font-medium text-gray-900 mb-3 block">Message Type</label>
                        <div className="grid grid-cols-4 gap-3">
                            {[
                                { id: 'info', icon: Info, color: 'blue', label: 'Info' },
                                { id: 'success', icon: CheckCircle, color: 'green', label: 'Success' },
                                { id: 'warning', icon: AlertTriangle, color: 'yellow', label: 'Warning' },
                                { id: 'error', icon: XCircle, color: 'red', label: 'Urgent' }
                            ].map((type) => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: type.id })}
                                    className={clsx(
                                        "flex flex-col items-center justify-center p-3 rounded-lg border transition-all text-xs font-medium gap-1",
                                        formData.type === type.id
                                            ? `border-${type.color}-500 bg-${type.color}-50 text-${type.color}-700 ring-1 ring-${type.color}-500`
                                            : "border-gray-200 hover:bg-gray-50 text-gray-600"
                                    )}
                                >
                                    <type.icon className={clsx("h-5 w-5", `text-${type.color}-500`)} />
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Message Input */}
                    <div>
                        <label className="text-sm font-medium text-gray-900 mb-1.5 block">Message Content</label>
                        <textarea
                            required
                            rows={4}
                            value={formData.message}
                            onChange={e => setFormData({ ...formData, message: e.target.value })}
                            className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm resize-none"
                            placeholder="Type your notification message here..."
                        />
                    </div>

                    {/* Action */}
                    <div className="pt-2">
                        <button
                            onClick={handleSubmit}
                            disabled={loading || !formData.message}
                            className="w-full flex justify-center items-center gap-2 rounded-lg bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Send className="h-5 w-5" />}
                            Send Notification
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
