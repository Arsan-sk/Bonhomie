import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { User, Mail, IdCard, Shield, Upload, Link as LinkIcon, Loader2, CheckCircle, AlertCircle, Calendar, Trophy, Key, Edit2, Lock } from 'lucide-react'

export default function ProfilePage({ profileId, role, isViewOnly = false }) {
    const { user } = useAuth()
    const [profile, setProfile] = useState(null)
    const [stats, setStats] = useState({ total: 0, confirmed: 0, pending: 0, wins: 0 })
    const [participatedEvents, setParticipatedEvents] = useState([])
    const [loading, setLoading] = useState(true)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState({ full_name: '', phone: '' })
    const [avatarMode, setAvatarMode] = useState(null) // 'upload' or 'url'
    const [avatarUrl, setAvatarUrl] = useState('')
    const [avatarFile, setAvatarFile] = useState(null)
    const [message, setMessage] = useState(null)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' })
    const [showPasswordForm, setShowPasswordForm] = useState(false)
    const [verifyingPassword, setVerifyingPassword] = useState(false)
    const [passwordVerified, setPasswordVerified] = useState(false)

    const targetProfileId = profileId || user?.id
    const isOwnProfile = targetProfileId === user?.id

    useEffect(() => {
        if (targetProfileId) {
            fetchProfileData()
        }
    }, [targetProfileId])

    const fetchProfileData = async () => {
        try {
            setLoading(true)

            // Fetch profile from profiles table
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', targetProfileId)
                .single()

            if (profileError) throw profileError
            setProfile(profileData)
            setEditForm({
                full_name: profileData.full_name || '',
                phone: profileData.phone || ''
            })

            // Fetch registrations for stats and participated events
            const { data: registrations, error: regsError } = await supabase
                .from('registrations')
                .select(`
                    *,
                    event:events(id, name, category, day, image_path, subcategory)
                `)
                .eq('profile_id', targetProfileId)
                .order('registered_at', { ascending: false })

            if (regsError) throw regsError

            // Calculate stats
            const confirmedCount = registrations.filter(r => r.status === 'confirmed').length
            const pendingCount = registrations.filter(r => r.status === 'pending').length

            setStats({
                total: registrations.length,
                confirmed: confirmedCount,
                pending: pendingCount,
                wins: 0 // Future enhancement
            })

            setParticipatedEvents(registrations)

        } catch (error) {
            console.error('Error fetching profile:', error)
            setMessage({ type: 'error', text: error.message })
        } finally {
            setLoading(false)
        }
    }

    const handleAvatarUpload = async () => {
        if (!avatarFile && !avatarUrl) {
            setMessage({ type: 'error', text: 'Please select an image or enter a URL' })
            return
        }

        setUploadingAvatar(true)
        setMessage(null)

        try {
            let finalAvatarUrl = avatarUrl

            // Upload file if selected
            if (avatarFile) {
                const fileExt = avatarFile.name.split('.').pop()
                const fileName = `${user.id}/${Date.now()}.${fileExt}`

                const { error: uploadError, data } = await supabase.storage
                    .from('profile-avatars')
                    .upload(fileName, avatarFile, { upsert: true })

                if (uploadError) throw uploadError

                const { data: { publicUrl } } = supabase.storage
                    .from('profile-avatars')
                    .getPublicUrl(fileName)

                finalAvatarUrl = publicUrl
            }

            // Update profile with new avatar URL
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: finalAvatarUrl })
                .eq('id', user.id)

            if (updateError) throw updateError

            setMessage({ type: 'success', text: 'Avatar updated successfully!' })
            setProfile({ ...profile, avatar_url: finalAvatarUrl })
            setAvatarMode(null)
            setAvatarUrl('')
            setAvatarFile(null)

        } catch (error) {
            console.error('Error uploading avatar:', error)
            setMessage({ type: 'error', text: error.message })
        } finally {
            setUploadingAvatar(false)
        }
    }

    const handleSaveProfile = async () => {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({
                    full_name: editForm.full_name,
                    phone: editForm.phone
                })
                .eq('id', user.id)

            if (error) throw error

            setMessage({ type: 'success', text: 'Profile updated successfully!' })
            setProfile({
                ...profile,
                full_name: editForm.full_name,
                phone: editForm.phone
            })
            setIsEditing(false)

        } catch (error) {
            console.error('Error updating profile:', error)
            setMessage({ type: 'error', text: error.message })
        }
    }

    const handleVerifyCurrentPassword = async (e) => {
        e.preventDefault()
        setVerifyingPassword(true)
        setMessage(null)

        try {
            // Verify current password by attempting to sign in
            const { error } = await supabase.auth.signInWithPassword({
                email: user.email,
                password: passwordForm.currentPassword
            })

            if (error) throw new Error('Current password is incorrect')

            setPasswordVerified(true)
            setMessage({ type: 'success', text: 'Password verified. Enter your new password.' })

        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setVerifyingPassword(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' })
            return
        }
        if (passwordForm.newPassword.length < 6) {
            setMessage({ type: 'error', text: 'Password must be at least 6 characters.' })
            return
        }

        setVerifyingPassword(true)
        setMessage(null)

        try {
            const { error } = await supabase.auth.updateUser({ password: passwordForm.newPassword })
            if (error) throw error

            setMessage({ type: 'success', text: 'Password changed successfully!' })
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
            setShowPasswordForm(false)
            setPasswordVerified(false)

        } catch (error) {
            setMessage({ type: 'error', text: error.message })
        } finally {
            setVerifyingPassword(false)
        }
    }

    const getRoleDisplay = () => {
        if (role === 'admin') return { label: 'Admin', color: 'red', icon: Shield }
        if (role === 'coordinator') return { label: 'Coordinator', color: 'purple', icon: Shield }
        return { label: 'Student', color: 'blue', icon: User }
    }

    const roleInfo = getRoleDisplay()

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
            {/* Hero Section - Avatar + Basic Info + Stats */}
            <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-8 text-white shadow-2xl">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                    {/* Avatar */}
                    <div className="relative">
                        <div className="h-32 w-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center overflow-hidden border-4 border-white/30">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                            ) : (
                                <span className="text-5xl font-bold">{profile?.full_name?.charAt(0) || 'U'}</span>
                            )}
                        </div>
                        {isOwnProfile && !isViewOnly && (
                            <button
                                onClick={() => setAvatarMode(avatarMode ? null : 'upload')}
                                className="absolute bottom-0 right-0 h-10 w-10 bg-white text-purple-600 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
                            >
                                <Edit2 className="h-5 w-5" />
                            </button>
                        )}
                    </div>

                    {/* Basic Info */}
                    <div className="flex-1 text-center md:text-left">
                        <h1 className="text-3xl font-bold mb-2">{profile?.full_name || 'User'}</h1>

                        {/* Email and Department on same line */}
                        <p className="text-white/80 mb-2">
                            {profile?.college_email || user?.email}
                            {profile?.department && (
                                <span className="ml-4 text-white/70">• {profile.department}</span>
                            )}
                        </p>

                        {/* Roll Number and Phone on same line */}
                        {(profile?.roll_number || profile?.phone) && (
                            <p className="text-white/60 text-sm mb-4">
                                {profile?.roll_number && `Roll No: ${profile.roll_number}`}
                                {profile?.roll_number && profile?.phone && <span className="mx-3">•</span>}
                                {profile?.phone && `Phone: ${profile.phone}`}
                            </p>
                        )}

                        <div className={`inline-flex items-center gap-2 px-4 py-2 bg-${roleInfo.color}-500/30 rounded-full text-sm font-bold`}>
                            <roleInfo.icon className="h-4 w-4" />
                            {roleInfo.label}
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <div className="text-xs text-white/70">Events</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="text-2xl font-bold">{stats.wins}</div>
                            <div className="text-xs text-white/70">Wins</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="text-2xl font-bold">{stats.confirmed}</div>
                            <div className="text-xs text-white/70">Confirmed</div>
                        </div>
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                            <div className="text-2xl font-bold">{stats.pending}</div>
                            <div className="text-xs text-white/70">Pending</div>
                        </div>
                    </div>
                </div>

                {/* Avatar Upload Section */}
                {avatarMode && isOwnProfile && !isViewOnly && (
                    <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-xl p-6">
                        <h3 className="font-bold mb-4">Update Avatar</h3>
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-sm mb-2">Upload Image</label>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setAvatarFile(e.target.files[0])}
                                    className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white"
                                />
                            </div>
                            <div className="flex items-center justify-center">
                                <span className="text-white/50">OR</span>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm mb-2">Paste Image URL</label>
                                <input
                                    type="url"
                                    value={avatarUrl}
                                    onChange={(e) => setAvatarUrl(e.target.value)}
                                    placeholder="https://example.com/avatar.jpg"
                                    className="w-full px-4 py-2 rounded-lg bg-white/20 border border-white/30 text-white placeholder-white/40"
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleAvatarUpload}
                            disabled={uploadingAvatar || (!avatarFile && !avatarUrl)}
                            className="mt-4 px-6 py-2 bg-white text-purple-600 rounded-lg font-bold hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {uploadingAvatar && <Loader2 className="h-4 w-4 animate-spin" />}
                            Save Avatar
                        </button>
                    </div>
                )}

                {/* Edit Profile Button */}
                {isOwnProfile && !isViewOnly && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="mt-6 px-6 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-semibold flex items-center gap-2 transition"
                    >
                        <Edit2 className="h-4 w-4" />
                        Edit Profile
                    </button>
                )}
            </div>

            {/* Messages */}
            {message && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                    {message.type === 'error' ? <AlertCircle className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            {/* Edit Profile Form */}
            {isEditing && isOwnProfile && !isViewOnly && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4">Edit Profile</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input
                                type="text"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                <Lock className="h-4 w-4 text-gray-400" />
                                Email (Read-only)
                            </label>
                            <input
                                type="email"
                                value={profile?.college_email || user?.email}
                                disabled
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                            />
                        </div>
                        {profile?.roll_number && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                    Roll Number (Read-only)
                                </label>
                                <input
                                    type="text"
                                    value={profile.roll_number}
                                    disabled
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
                                />
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                            <input
                                type="tel"
                                value={editForm.phone}
                                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                                placeholder="Enter phone number"
                                className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleSaveProfile}
                                className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
                            >
                                Save Changes
                            </button>
                            <button
                                onClick={() => {
                                    setIsEditing(false)
                                    setEditForm({
                                        full_name: profile.full_name,
                                        phone: profile.phone
                                    })
                                }}
                                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Participated Events */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-600" />
                    Participated Events
                </h3>
                {participatedEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                        <Trophy className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No events participated yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {participatedEvents.map((reg) => (
                            <div key={reg.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                                <div className="flex items-start justify-between mb-2">
                                    <h4 className="font-bold text-gray-900">{reg.event?.name}</h4>
                                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${reg.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                                        reg.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            'bg-red-100 text-red-700'
                                        }`}>
                                        {reg.status.charAt(0).toUpperCase() + reg.status.slice(1)}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-600 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-3 w-3" />
                                        {reg.event?.day || 'TBA'}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Trophy className="h-3 w-3" />
                                        {reg.event?.category || 'General'}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Change Password */}
            {isOwnProfile && !isViewOnly && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                        <Key className="h-5 w-5 text-purple-600" />
                        Change Password
                    </h3>
                    {!showPasswordForm ? (
                        <button
                            onClick={() => setShowPasswordForm(true)}
                            className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition"
                        >
                            Change Password
                        </button>
                    ) : !passwordVerified ? (
                        <form onSubmit={handleVerifyCurrentPassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.currentPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={verifyingPassword}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {verifyingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Verify
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordForm(false)
                                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                    }}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    ) : (
                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    disabled={verifyingPassword}
                                    className="px-6 py-2 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {verifyingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
                                    Update Password
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowPasswordForm(false)
                                        setPasswordVerified(false)
                                        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
                                    }}
                                    className="px-6 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </div>
    )
}
