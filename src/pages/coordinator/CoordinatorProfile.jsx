import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../lib/supabase'
import { User, Mail, Shield, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react'

export default function CoordinatorProfile() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState(null)
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' })

    const handleUpdatePassword = async (e) => {
        e.preventDefault()
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' })
            return
        }
        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
            return
        }

        setLoading(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
            if (error) throw error
            setMessage({ type: 'success', text: 'Password updated successfully.' })
            setPasswordForm({ newPassword: '', confirmPassword: '' })
        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Coordinator Profile</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
                        <div className="h-24 w-24 bg-indigo-100 text-indigo-600 rounded-full mx-auto flex items-center justify-center mb-4">
                            <span className="text-3xl font-bold">{user?.user_metadata?.full_name?.charAt(0) || 'C'}</span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{user?.user_metadata?.full_name || 'Coordinator'}</h2>
                        <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
                        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">
                            <Shield className="h-3 w-3" /> Coordinator Role
                        </div>
                    </div>
                </div>

                {/* Details & Settings */}
                <div className="md:col-span-2 space-y-6">
                    {/* Basic Info */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900">Details</h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><User className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Full Name</p>
                                    <p className="font-medium text-gray-900">{user?.user_metadata?.full_name || '-'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-gray-100 rounded-lg text-gray-500"><Mail className="h-5 w-5" /></div>
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Email Address</p>
                                    <p className="font-medium text-gray-900">{user?.email}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                            <h3 className="font-bold text-gray-900 flex items-center gap-2"><Key className="h-4 w-4" /> Security</h3>
                        </div>
                        <div className="p-6">
                            <form onSubmit={handleUpdatePassword} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                    <input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                                    <input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {message && (
                                    <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                                        {message.type === 'error' ? <AlertCircle className="h-4 w-4" /> : <CheckCircle className="h-4 w-4" />}
                                        {message.text}
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading || !passwordForm.newPassword}
                                        className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                                    >
                                        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                                        Update Password
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
