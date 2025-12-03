import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { CheckCircle, X, Upload, Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react'

const registrationSchema = z.object({
    transaction_id: z.string().min(5, 'Transaction ID is required'),
    team_members: z.array(z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
        roll_number: z.string().min(1, 'Roll number is required'),
    })).optional(),
})

export default function EventRegistration() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [event, setEvent] = useState(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [file, setFile] = useState(null)
    const [error, setError] = useState('')

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registrationSchema),
        defaultValues: {
            team_members: [],
        },
    })

    const teamMembers = watch('team_members')

    useEffect(() => {
        fetchEvent()
    }, [id])

    const fetchEvent = async () => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', id)
                .single()

            if (error) throw error
            setEvent(data)
        } catch (error) {
            console.error('Error fetching event:', error)
            setError('Failed to load event details')
        } finally {
            setLoading(false)
        }
    }

    const onDrop = useCallback((acceptedFiles) => {
        setFile(acceptedFiles[0])
    }, [])

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'image/*': [] },
        maxFiles: 1,
    })

    const onSubmit = async (data) => {
        if (!file) {
            setError('Payment screenshot is required')
            return
        }

        // Validate team size
        if (event.subcategory === 'Group') {
            const currentSize = (teamMembers?.length || 0) + 1 // +1 for the registrant
            if (currentSize < event.min_team_size) {
                setError(`Minimum team size is ${event.min_team_size} (including you)`)
                return
            }
            if (currentSize > event.max_team_size) {
                setError(`Maximum team size is ${event.max_team_size} (including you)`)
                return
            }
        }

        setUploading(true)
        setError('')

        try {
            // 1. Upload screenshot
            const fileExt = file.name.split('.').pop()
            const fileName = `${user.id}/${event.id}_${Date.now()}.${fileExt}`
            const { error: uploadError, data: uploadData } = await supabase.storage
                .from('payment_proofs')
                .upload(fileName, file)

            if (uploadError) throw uploadError

            // 2. Create registration
            const { error: regError } = await supabase
                .from('registrations')
                .insert({
                    profile_id: user.id,
                    event_id: event.id,
                    transaction_id: data.transaction_id,
                    payment_screenshot_path: uploadData.path,
                    team_members: data.team_members || [],
                    status: 'pending',
                })

            if (regError) throw regError

            navigate(`/events/${id}`)
        } catch (err) {
            console.error('Registration error:', err)
            setError(err.message || 'Failed to register. Please check your connection and try again.')
        } finally {
            setUploading(false)
        }
    }

    const addTeamMember = () => {
        const currentMembers = teamMembers || []
        if (currentMembers.length + 1 >= event.max_team_size) return // +1 for self
        setValue('team_members', [...currentMembers, { name: '', email: '', roll_number: '' }])
    }

    const removeTeamMember = (index) => {
        const currentMembers = teamMembers || []
        setValue('team_members', currentMembers.filter((_, i) => i !== index))
    }

    if (loading) return <div className="p-8 text-center">Loading...</div>
    if (!event) return <div className="p-8 text-center">Event not found</div>

    return (
        <div className="bg-gray-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
                >
                    <ArrowLeft className="h-5 w-5 mr-2" /> Back to Event
                </button>

                <div className="bg-white shadow sm:rounded-lg overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            Register for {event.name}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Complete the form below to register.
                        </p>
                    </div>
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Payment Info */}
                            <div className="bg-blue-50 p-4 rounded-md border border-blue-100">
                                <h4 className="text-sm font-medium text-blue-800 mb-2">Payment Details</h4>
                                <p className="text-sm text-blue-700">
                                    Registration Fee: <strong className="text-lg">₹{event.fee}</strong>
                                </p>
                                <p className="text-sm text-blue-700 mt-1">
                                    Pay to UPI ID: <strong className="font-mono bg-blue-100 px-1 rounded">bonhomei@upi</strong>
                                </p>
                            </div>

                            {/* Transaction ID */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Transaction ID</label>
                                <input
                                    type="text"
                                    {...register('transaction_id')}
                                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm border p-2"
                                    placeholder="Enter UPI Transaction ID"
                                />
                                {errors.transaction_id && <p className="text-red-500 text-xs mt-1">{errors.transaction_id.message}</p>}
                            </div>

                            {/* Screenshot Upload */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Payment Screenshot</label>
                                <div
                                    {...getRootProps()}
                                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <input {...getInputProps()} />
                                    {file ? (
                                        <div className="flex items-center justify-center space-x-2">
                                            <span className="text-sm text-gray-900 font-medium">{file.name}</span>
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    setFile(null)
                                                }}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-1 text-center">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="text-sm text-gray-600">Drag & drop or click to upload</p>
                                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                        </div>
                                    )}
                                </div>
                                {file && (
                                    <p className="mt-2 text-xs text-green-600 flex items-center justify-center">
                                        <CheckCircle className="h-3 w-3 mr-1" /> File selected
                                    </p>
                                )}
                            </div>

                            {/* Team Members (if Group) */}
                            {event.subcategory === 'Group' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <label className="block text-sm font-medium text-gray-700">Team Members</label>
                                        <button
                                            type="button"
                                            onClick={addTeamMember}
                                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-full shadow-sm text-white bg-primary hover:bg-blue-700 focus:outline-none"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Member
                                        </button>
                                    </div>
                                    <div className="space-y-3">
                                        {teamMembers?.map((member, index) => (
                                            <div key={index} className="flex gap-2 items-start bg-gray-50 p-3 rounded-md border border-gray-200">
                                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                                                    <input
                                                        placeholder="Name"
                                                        {...register(`team_members.${index}.name`)}
                                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary p-1.5 border"
                                                    />
                                                    <input
                                                        placeholder="Email"
                                                        {...register(`team_members.${index}.email`)}
                                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary p-1.5 border"
                                                    />
                                                    <input
                                                        placeholder="Roll No"
                                                        {...register(`team_members.${index}.roll_number`)}
                                                        className="text-sm border-gray-300 rounded-md shadow-sm focus:border-primary focus:ring-primary p-1.5 border"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTeamMember(index)}
                                                    className="text-red-500 hover:text-red-700 p-1.5"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {teamMembers?.length === 0 && (
                                            <p className="text-sm text-gray-500 italic text-center py-2">No team members added yet.</p>
                                        )}
                                    </div>
                                    <p className="mt-2 text-xs text-gray-500">
                                        Team Size: {event.min_team_size} - {event.max_team_size} members (including you).
                                    </p>
                                </div>
                            )}

                            {error && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                                            <div className="mt-2 text-sm text-red-700">
                                                <p>{error}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="pt-4">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {uploading ? (
                                        <>
                                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                                            Submitting...
                                        </>
                                    ) : (
                                        'Submit Registration'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
