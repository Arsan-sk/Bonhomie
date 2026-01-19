import { useNavigate } from 'react-router-dom'
import { Home, ArrowLeft, Search, AlertCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function NotFound() {
    const navigate = useNavigate()
    const { profile } = useAuth()

    const handleGoBack = () => {
        navigate(-1)
    }

    const handleGoHome = () => {
        // Redirect to appropriate dashboard based on role
        if (profile) {
            switch (profile.role) {
                case 'admin':
                    navigate('/admin/dashboard')
                    break
                case 'coordinator':
                    navigate('/coordinator/dashboard')
                    break
                case 'student':
                    navigate('/student/dashboard')
                    break
                default:
                    navigate('/')
            }
        } else {
            navigate('/')
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 flex items-center justify-center px-4 py-6 relative overflow-hidden">
            {/* Background Animated Blobs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob"></div>
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-2000"></div>
                <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-blob animation-delay-4000"></div>
            </div>

            <div className="max-w-2xl w-full text-center relative z-10">
                {/* Animated 404 Number with glow */}
                <div className="relative mb-4">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-48 h-48 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full filter blur-3xl opacity-30 animate-pulse"></div>
                    </div>
                    
                    <h1 className="relative text-[7rem] md:text-[8rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 leading-none">
                        404
                    </h1>
                </div>

                {/* Alert Icon with subtle animation */}
                <div className="flex justify-center mb-4">
                    <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-md opacity-40"></div>
                        <div className="relative bg-white p-3 rounded-full shadow-2xl border-4 border-purple-100">
                            <AlertCircle className="h-8 w-8 text-purple-600" />
                        </div>
                    </div>
                </div>

                {/* Main Message */}
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    Page Not Found
                </h2>
                <p className="text-base text-gray-600 mb-6 max-w-md mx-auto leading-relaxed">
                    Oops! The page you're looking for seems to have wandered off. Let's get you back on track.
                </p>

                {/* Decorative Search Icon with ring animation */}
                <div className="flex justify-center mb-6">
                    <div className="relative w-16 h-16">
                        {/* Spinning dashed ring */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-16 h-16 border-3 border-purple-300 border-dashed rounded-full animate-spin-slow opacity-60"></div>
                        </div>
                        {/* Search icon in center */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Search className="h-7 w-7 text-gray-400" strokeWidth={2} />
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-6">
                    <button
                        onClick={handleGoBack}
                        className="group flex items-center gap-2 px-6 py-2.5 bg-white text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all duration-300 shadow-lg hover:shadow-xl border-2 border-gray-200 hover:border-purple-300 transform hover:-translate-y-1 min-w-[140px]"
                    >
                        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-300" />
                        Go Back
                    </button>
                    
                    <button
                        onClick={handleGoHome}
                        className="group flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1 min-w-[140px]"
                    >
                        <Home className="h-4 w-4 group-hover:scale-110 transition-transform duration-300" />
                        {profile ? 'Go to Dashboard' : 'Go to Home'}
                    </button>
                </div>

                {/* Additional helpful text */}
                <div className="pt-4 border-t border-gray-300/50">
                    <p className="text-xs text-gray-500">
                        If you believe this is an error, please contact support or try again later.
                    </p>
                </div>
            </div>

            {/* Custom animations styles */}
            <style>{`
                @keyframes blob {
                    0%, 100% { 
                        transform: translate(0, 0) scale(1);
                    }
                    25% { 
                        transform: translate(20px, -30px) scale(1.05);
                    }
                    50% { 
                        transform: translate(-15px, 20px) scale(0.95);
                    }
                    75% { 
                        transform: translate(15px, 15px) scale(1.02);
                    }
                }
                
                @keyframes spin-slow {
                    from { 
                        transform: rotate(0deg);
                    }
                    to { 
                        transform: rotate(360deg);
                    }
                }
                
                .animate-blob {
                    animation: blob 10s ease-in-out infinite;
                }
                
                .animation-delay-2000 {
                    animation-delay: 2s;
                }
                
                .animation-delay-4000 {
                    animation-delay: 4s;
                }
                
                .animate-spin-slow {
                    animation: spin-slow 4s linear infinite;
                }
            `}</style>
        </div>
    )
}
