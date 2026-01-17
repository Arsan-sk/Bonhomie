import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

const registerSchema = z.object({
    full_name: z.string().min(2, 'Full name is required'),
    email: z.string()
        .email('Invalid email address')
        .refine((email) => email.endsWith('@aiktc.ac.in') || email.endsWith('@bonhomie.com'), {
            message: 'Email must be from @aiktc.ac.in or @bonhomie.com domain'
        }),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string(),
    roll_number: z.string().min(1, 'Roll number is required'),
    school: z.enum(['SOP', 'SOET', 'SOA'], { required_error: 'School is required' }),
    department: z.enum(['CO', 'AIML', 'DS', 'ECS', 'CE', 'ME', 'ECE', 'Electrical', 'Diploma Pharmacy', 'Degree Pharmacy', 'Diploma Architecture', 'Degree Architecture'], { required_error: 'Department is required' }),
    program: z.enum(['Diploma Engineering', 'Pharmacy', 'Architecture'], { required_error: 'Program is required' }),
    year_of_study: z.string().min(1, 'Year of study is required'),
    admission_year: z.string().min(4, 'Admission year is required'),
    expected_passout_year: z.string().min(4, 'Expected passout year is required'),
    phone: z.string().min(10, 'Valid phone number is required'),
    gender: z.enum(['Male', 'Female', 'Other'], { required_error: 'Gender is required' }),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
})

import { supabase } from '../lib/supabase'

export default function Register() {
    const { signUp } = useAuth()
    const navigate = useNavigate()
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(registerSchema),
    })

    const onSubmit = async (data) => {
        setIsLoading(true)
        setError('')
        try {
            const { full_name, email, password, confirmPassword, ...profileData } = data

            console.log('=== REGISTRATION DEBUG ===')
            console.log('Email:', email)
            console.log('Full Name:', full_name)
            console.log('Profile Data:', profileData)
            console.log('Metadata to send:', { full_name, role: 'student', ...profileData })

            // 1. Sign up user
            const { data: authData, error: authError } = await signUp(email, password, {
                full_name,
                role: 'student',
                ...profileData
            })

            console.log('Auth Response:', { authData, authError })

            if (authError) throw authError



            // Profile is created automatically by database trigger using metadata
            console.log("Profile Data Sent in Metadata: ", profileData);

            console.log("Profile Data Saved: ", profileData);

            // Fetch user profile to redirect to appropriate dashboard
            const { data: profileResponse, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', authData.user.id)
                .single()

            if (profileError) {
                console.error('Profile fetch error after registration:', profileError)
                // Default to student dashboard if profile fetch fails
                navigate('/student/dashboard')
                return
            }

            // Role-based redirect after successful registration
            const role = profileResponse?.role || 'student'
            if (role === 'admin') {
                navigate('/admin/dashboard')
            } else if (role === 'coordinator') {
                navigate('/coordinator/dashboard')
            } else {
                navigate('/student/dashboard')
            }
        } catch (err) {
        console.error('Registration error:', err)

        // Parse error and provide user-friendly messages
        let errorMessage = 'Registration failed. Please try again.'

        // Check error object structure
        const errorText = err.message?.toLowerCase() || ''
        const errorCode = err.code || ''
        const errorStatus = err.status || err.statusCode || ''

        // Network and connection errors (common on mobile)
        if (!navigator.onLine) {
            errorMessage = '🌐 No internet connection. Please check your network and try again.'
        }
        else if (errorText.includes('fetch') || errorText.includes('network') || errorText.includes('connection')) {
            errorMessage = '🌐 Network error. Please check your internet connection and try again.'
        }
        else if (errorText.includes('timeout') || errorText.includes('timed out')) {
            errorMessage = '⏱️ Request timed out. Please try again with a stable connection.'
        }
        // Server errors
        else if (errorStatus === 500 || errorText.includes('internal server') || errorText.includes('server error')) {
            errorMessage = '❌ Server error. Please try again in a few moments.'
        }
        else if (errorStatus === 503 || errorText.includes('service unavailable')) {
            errorMessage = '❌ Service temporarily unavailable. Please try again later.'
        }
        // Specific error messages from database trigger
        else if (errorText.includes('email already registered')) {
            errorMessage = '❌ This email is already registered. Please use a different email or try logging in.'
        }
        else if (errorText.includes('roll number already registered')) {
            errorMessage = '❌ This roll number is already registered. Please check your roll number or contact admin.'
        }
        else if (errorText.includes('invalid email domain')) {
            errorMessage = '❌ Invalid email domain. Only @aiktc.ac.in and @bonhomie.com emails are allowed.'
        }
        else if (errorText.includes('missing required information')) {
            errorMessage = '❌ Please fill in all required fields and try again.'
        }
        // Generic duplicate errors
        else if (errorText.includes('duplicate') || errorText.includes('already exists') || errorCode === '23505') {
            errorMessage = '❌ Email or Roll Number already exists. Please use different credentials.'
        }
        else if (errorText.includes('user already registered')) {
            errorMessage = '❌ Account already exists with this email. Try logging in instead.'
        }
        // Rate limiting
        else if (errorText.includes('rate limit') || errorText.includes('too many') || errorStatus === 429) {
            errorMessage = '⏳ Too many attempts. Please wait a few minutes and try again.'
        }
        // Password issues
        else if (errorText.includes('password')) {
            errorMessage = '🔒 Password must be at least 6 characters long.'
        }
        // Database constraint errors
        else if (errorCode === '23503') {
            errorMessage = '❌ Invalid reference data. Please contact support.'
        }
        else if (errorCode === '23502') {
            errorMessage = '❌ Missing required information. Please fill all fields.'
        }
        // Auth-specific errors
        else if (errorText.includes('email not confirmed')) {
            errorMessage = '📧 Please check your email to confirm your account.'
        }
        else if (errorText.includes('invalid credentials')) {
            errorMessage = '❌ Invalid email or password.'
        }
        // Show actual message if it's clear and short
        else if (err.message && err.message.length < 150 && !errorText.includes('unexpected')) {
            errorMessage = `❌ ${err.message}`
        }
        // Generic fallback for unexpected errors
        else if (errorText.includes('unexpected')) {
            errorMessage = '❌ Unexpected error occurred. Please ensure all fields are filled correctly and try again. If the issue persists, contact support.'
        }

        setError(errorMessage)
    } finally {
        setIsLoading(false)
    }

}


return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <h2 className="mt-10 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900">
                Create your account
            </h2>
        </div>

        <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-[600px]">
            <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
                <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">

                    {/* Full Name */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Full Name</label>
                        <input type="text" {...register('full_name')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                        {errors.full_name && <p className="mt-1 text-sm text-red-600">{errors.full_name.message}</p>}
                    </div>

                    {/* Email */}
                    <div className="sm:col-span-2">
                        <label className="block text-sm font-medium leading-6 text-gray-900">Email</label>
                        <input type="email" {...register('email')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                        {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">Password</label>
                        <input type="password" {...register('password')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                        {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
                    </div>

                    {/* Confirm Password */}
                    <div>
                        <label className="block text-sm font-medium leading-6 text-gray-900">Confirm Password</label>
                        <input type="password" {...register('confirmPassword')} className="mt-2 block w-full rounded-md border-0 py-1.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6" />
                        {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
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

                {error && (
                    <div className="rounded-md bg-red-50 p-4">
                        <div className="flex">
                            <div className="ml-3">
                                <h3 className="text-sm font-medium text-red-800">{error}</h3>
                            </div>
                        </div>
                    </div>
                )}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="flex w-full justify-center rounded-md bg-primary px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create Account
                    </button>
                </div>
            </form>

            <p className="mt-10 text-center text-sm text-gray-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold leading-6 text-primary hover:text-blue-500">
                    Sign in
                </Link>
            </p>
        </div>
    </div>
)
}
