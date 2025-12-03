import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useDropzone } from 'react-dropzone'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { X, Upload, Loader2, Plus, Trash2 } from 'lucide-react'

const registrationSchema = z.object({
    transaction_id: z.string().min(5, 'Transaction ID is required'),
    team_members: z.array(z.object({
        name: z.string().min(1, 'Name is required'),
        email: z.string().email('Invalid email'),
        roll_number: z.string().min(1, 'Roll number is required'),
    })).optional(),
})

export default function EventRegistrationModal({ event, isOpen, onClose, onSuccess }) {
    const { user, profile } = useAuth()
    const [uploading, setUploading] = useState(false)
    const [file, setFile] = useState(null)
    const [error, setError] = useState('')

    const {
        register,
        handleSubmit,
        control,
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
                .from('payment_proofs') // Ensure this bucket exists!
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

            onSuccess()
            onClose()
        } catch (err) {
            console.error(err)
            setError(err.message || 'Failed to register')
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

    console.log('EventRegistrationModal render:', { isOpen, eventId: event?.id })

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="flex justify-between items-start">
                            <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                Register for {event.name}
                            </h3>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
                            {/* Payment Info */}
                            <div className="bg-blue-50 p-4 rounded-md">
                                <p className="text-sm text-blue-700">
                                    Registration Fee: <strong>₹{event.fee}</strong>
                                </p>
                                <p className="text-xs text-blue-600 mt-1">
                                    Pay to UPI: <strong>bonhomei@upi</strong>
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
                                    className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer ${isDragActive ? 'border-primary bg-blue-50' : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                >
                                    <input {...getInputProps()} />
                                    {file ? (
                                        <p className="text-sm text-gray-600">{file.name}</p>
                                    ) : (
                                        <div className="space-y-1 text-center">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <p className="text-xs text-gray-500">PNG, JPG up to 5MB</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team Members (if Group) */}
                            {event.subcategory === 'Group' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Team Members</label>
                                        <button
                                            type="button"
                                            onClick={addTeamMember}
                                            className="text-xs flex items-center text-primary hover:text-blue-700"
                                        >
                                            <Plus className="h-3 w-3 mr-1" /> Add Member
                                        </button>
                                    </div>
                                    <div className="space-y-3 max-h-40 overflow-y-auto">
                                        {teamMembers?.map((member, index) => (
                                            <div key={index} className="flex gap-2 items-start bg-gray-50 p-2 rounded">
                                                <div className="grid grid-cols-3 gap-2 flex-1">
                                                    <input
                                                        placeholder="Name"
                                                        {...register(`team_members.${index}.name`)}
                                                        className="text-xs border rounded p-1"
                                                    />
                                                    <input
                                                        placeholder="Email"
                                                        {...register(`team_members.${index}.email`)}
                                                        className="text-xs border rounded p-1"
                                                    />
                                                    <input
                                                        placeholder="Roll No"
                                                        {...register(`team_members.${index}.roll_number`)}
                                                        className="text-xs border rounded p-1"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTeamMember(index)}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Show errors for team members if needed */}
                                </div>
                            )}

                            {error && <p className="text-red-500 text-sm">{error}</p>}

                            <div className="mt-5 sm:mt-6">
                                <button
                                    type="submit"
                                    disabled={uploading}
                                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-primary px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none disabled:opacity-50"
                                >
                                    {uploading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Submit Registration'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
