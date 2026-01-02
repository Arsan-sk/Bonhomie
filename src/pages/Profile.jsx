import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Loader2 } from 'lucide-react'

// Schema - mostly same as register but without password
const profileSchema = z.object({
    full_name: z.string().min(2, 'Full name is required'),
    roll_number: z.string().min(1, 'Roll number is required'),
    school: z.enum(['SOP', 'SOET', 'SOA'], { required_error: 'School is required' }),
    department: z.enum(['CO', 'AIML', 'DS', 'ECS', 'CE', 'ME', 'ECE', 'Electrical', 'Diploma Pharmacy', 'Degree Pharmacy', 'Diploma Architecture', 'Degree Architecture'], { required_error: 'Department is required' }),
    program: z.enum(['Diploma Engineering', 'Pharmacy', 'Architecture'], { required_error: 'Program is required' }),
    year_of_study: z.string().min(1, 'Year of study is required'),
    admission_year: z.string().min(4, 'Admission year is required'),
    expected_passout_year: z.string().min(4, 'Expected passout year is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
})

export default function Profile() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(true)
    const [successMsg, setSuccessMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting },
    } = useForm({
        resolver: zodResolver(profileSchema),
    })

    useEffect(() => {
        if (user) {
            getProfile()
        }
    }, [user])

    const getProfile = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single()

            if (error) {
                throw error
            }

            if (data) {
                reset({
                    full_name: data.full_name || '',
                    roll_number: data.roll_number || '',
                    school: data.school || '',
                    department: data.department || '',
                    program: data.program || '',
                    year_of_study: data.year_of_study || '',
                    admission_year: data.admission_year || '',
                    expected_passout_year: data.expected_passout_year || '',
                    phone: data.phone || '',
                    gender: data.gender || 'Male',
                })
            }
        } catch (error) {
            console.error('Error loading profile:', error)
            setErrorMsg('Error loading profile data')
        } finally {
            setLoading(false)
        }
    }

    const onSubmit = async (data) => {
        setSuccessMsg('')
        setErrorMsg('')
        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    ...data,
                    updated_at: new Date().toISOString(),
                })

            if (error) throw error
            setSuccessMsg('Profile updated successfully!')
        } catch (error) {
            console.error('Error updating profile:', error)
            setErrorMsg('Failed to update profile')
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="mx-auto max-w-3xl">
                <div className="md:flex md:items-center md:justify-between mb-8">
                    <div className="min-w-0 flex-1">
                        <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:truncate sm:text-3xl sm:tracking-tight">
                            My Profile
                        </h2>
                    </div>
                </div>

                <div className="bg-white shadow sm:rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

                            {/* Read-only Email */}
                            <div>
                                <label className="block text-sm font-medium leading-6 text-gray-900">Email</label>
                                <div className="mt-2">
                                    <input
                                        type="email"
                                        disabled
                                        value={user?.email}
                                        className="block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 bg-gray-50 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                                    />
                                    <p className="mt-1 text-xs text-gray-500">Email cannot be changed.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                                {/* Full Name */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
                                    <input type="text" {...register('full_name')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                                    {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
                                </div>

                                {/* Roll Number */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Roll Number</label>
                                    <input type="text" {...register('roll_number')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                                    {errors.roll_number && <p className="mt-1 text-sm text-red-600">{errors.roll_number.message}</p>}
                                </div>

                                {/* Phone */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Phone</label>
                                    <input type="tel" {...register('phone')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                                    {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
                                </div>

                                {/* School */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">School</label>
                                    <select {...register('school')} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6">
                                        <option value="">Select School</option>
                                        <option value="SOP">SOP</option>
                                        <option value="SOET">SOET</option>
                                        <option value="SOA">SOA</option>
                                    </select>
                                    {errors.school && <p className="mt-1 text-sm text-red-600">{errors.school.message}</p>}
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Department</label>
                                    <select {...register('department')} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6">
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
                                    {errors.department && <p className="mt-1 text-sm text-red-600">{errors.department.message}</p>}
                                </div>

                                {/* Program  */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Program</label>
                                    <select {...register('program')} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6">
                                        <option value="">Select Program</option>
                                        <option value="Diploma Engineering">Diploma Engineering</option>
                                        <option value="Pharmacy">Pharmacy</option>
                                        <option value="Architecture">Architecture</option>
                                    </select>
                                    {errors.program && <p className="mt-1 text-sm text-red-600">{errors.program.message}</p>}
                                </div>

                                {/* Year  */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Year of Study</label>
                                    <select {...register('year_of_study')} className="mt-2 block w-full rounded-md border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6">
                                        <option value="">Select Year</option>
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                        <option value="5">5th Year</option>
                                    </select>
                                    {errors.year_of_study && <p className="mt-1 text-sm text-red-600">{errors.year_of_study.message}</p>}
                                </div>

                                {/* Admission year  */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Admission Year</label>
                                    <input type="text" {...register('admission_year')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                                    {errors.admission_year && <p className="mt-1 text-sm text-red-600">{errors.admission_year.message}</p>}
                                </div>

                                {/* Expected Passout  */}
                                <div>
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Expected Passout</label>
                                    <input type="text" {...register('expected_passout_year')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                                    {errors.expected_passout_year && <p className="mt-1 text-sm text-red-600">{errors.expected_passout_year.message}</p>}
                                </div>

                                {/* Gender  */}
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-medium leading-6 text-gray-900">Gender</label>
                                    <div className="mt-2 flex space-x-6">
                                        <div className="flex items-center gap-x-3">
                                            <input id="male" type="radio" value="Male" {...register('gender')} className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" />
                                            <label htmlFor="male" className="block text-sm font-medium leading-6 text-gray-900">Male</label>
                                        </div>
                                        <div className="flex items-center gap-x-3">
                                            <input id="female" type="radio" value="Female" {...register('gender')} className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" />
                                            <label htmlFor="female" className="block text-sm font-medium leading-6 text-gray-900">Female</label>
                                        </div>
                                        <div className="flex items-center gap-x-3">
                                            <input id="other" type="radio" value="Other" {...register('gender')} className="h-4 w-4 border-gray-300 text-primary focus:ring-primary" />
                                            <label htmlFor="other" className="block text-sm font-medium leading-6 text-gray-900">Other</label>
                                        </div>
                                    </div>
                                    {errors.gender && <p className="mt-1 text-sm text-red-600">{errors.gender.message}</p>}
                                </div>
                            </div>

                            {successMsg && (
                                <div className="rounded-md bg-green-50 p-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-green-800">{successMsg}</h3>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="rounded-md bg-red-50 p-4">
                                    <div className="flex">
                                        <div className="ml-3">
                                            <h3 className="text-sm font-medium text-red-800">{errorMsg}</h3>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end pt-5">
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50 flex items-center"
                                >
                                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Save Changes
                                </button>
                            </div>

                        </form>
                    </div>
                </div>
            </div>
        </div>
    )
}
