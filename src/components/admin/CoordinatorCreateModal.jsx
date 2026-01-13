import { useState } from 'react'
import { X, Loader2, UserPlus } from 'lucide-react'
import { supabase } from '../../lib/supabase'

export default function CoordinatorCreateModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        password: '',
        roll_number: '',
        phone: '',
        school: '',
        department: '',
        program: '',
        year_of_study: '',
        admission_year: '',
        expected_passout_year: '',
        gender: ''
    })
    const [creating, setCreating] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError('')
        setCreating(true)

        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        full_name: formData.full_name,
                        role: 'coordinator',
                        roll_number: formData.roll_number,
                        phone: formData.phone,
                        school: formData.school,
                        department: formData.department,
                        program: formData.program,
                        year_of_study: formData.year_of_study,
                        admission_year: formData.admission_year,
                        expected_passout_year: formData.expected_passout_year,
                        gender: formData.gender
                    }
                }
            })

            if (authError) throw authError

            // Profile is created automatically by database trigger using metadata
            alert(`Coordinator created successfully!\n\nLogin Credentials:\nEmail: ${formData.email}\nPassword: ${formData.password}\n\nPlease share these credentials securely.`)
            onSuccess()
            handleClose()
        } catch (error) {
            console.error('Error creating coordinator:', error)
            setError(error.message || 'Failed to create coordinator')
        } finally {
            setCreating(false)
        }
    }

    const handleClose = () => {
        setFormData({
            full_name: '',
            email: '',
            password: '',
            roll_number: '',
            phone: '',
            school: '',
            department: '',
            program: '',
            year_of_study: '',
            admission_year: '',
            expected_passout_year: '',
            gender: ''
        })
        setError('')
        onClose()
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose}></div>

                <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                    {/* Header */}
                    <div className="sticky top-0 bg-white flex items-center justify-between p-6 border-b border-gray-200 z-10">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <UserPlus className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Create New Coordinator</h3>
                                <p className="text-sm text-gray-500">Add a student coordinator account</p>
                            </div>
                        </div>
                        <button onClick={handleClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                <p className="text-sm text-red-700">{error}</p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Full Name */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Password */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Roll Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.roll_number}
                                    onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                                <input
                                    type="tel"
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* School */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
                                <select
                                    required
                                    value={formData.school}
                                    onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select School</option>
                                    <option value="SOP">SOP</option>
                                    <option value="SOET">SOET</option>
                                    <option value="SOA">SOA</option>
                                </select>
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                                <select
                                    required
                                    value={formData.department}
                                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select Department</option>
                                    <option value="CO">CO</option>
                                    <option value="AIML">AIML</option>
                                    <option value="DS">DS</option>
                                    <option value="ECS">ECS</option>
                                    <option value="CE">CE</option>
                                    <option value="ME">ME</option>
                                    <option value="ECE">ECE</option>
                                    <option value="Electrical">Electrical</option>
                                    <option value="Diploma Pharmacy">Diploma Pharmacy</option>
                                    <option value="Degree Pharmacy">Degree Pharmacy</option>
                                    <option value="Diploma Architecture">Diploma Architecture</option>
                                    <option value="Degree Architecture">Degree Architecture</option>
                                </select>
                            </div>

                            {/* Program */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Program *</label>
                                <select
                                    required
                                    value={formData.program}
                                    onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select Program</option>
                                    <option value="Diploma Engineering">Diploma Engineering</option>
                                    <option value="Pharmacy">Pharmacy</option>
                                    <option value="Architecture">Architecture</option>
                                </select>
                            </div>

                            {/* Year of Study */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Year of Study *</label>
                                <select
                                    required
                                    value={formData.year_of_study}
                                    onChange={(e) => setFormData({ ...formData, year_of_study: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                >
                                    <option value="">Select Year</option>
                                    <option value="1">1st Year</option>
                                    <option value="2">2nd Year</option>
                                    <option value="3">3rd Year</option>
                                    <option value="4">4th Year</option>
                                    <option value="5">5th Year</option>
                                </select>
                            </div>

                            {/* Admission Year */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Admission Year *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="2023"
                                    value={formData.admission_year}
                                    onChange={(e) => setFormData({ ...formData, admission_year: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Expected Passout */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Expected Passout *</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="2026"
                                    value={formData.expected_passout_year}
                                    onChange={(e) => setFormData({ ...formData, expected_passout_year: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                />
                            </div>

                            {/* Gender */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                                <div className="flex gap-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="Male"
                                            checked={formData.gender === 'Male'}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                            required
                                        />
                                        <span className="text-sm text-gray-700">Male</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="Female"
                                            checked={formData.gender === 'Female'}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">Female</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="radio"
                                            name="gender"
                                            value="Other"
                                            checked={formData.gender === 'Other'}
                                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <span className="text-sm text-gray-700">Other</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 pt-4 border-t border-gray-200">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating}
                                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {creating ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    <>
                                        <UserPlus className="h-4 w-4" />
                                        Create Coordinator
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
