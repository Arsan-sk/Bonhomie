import { useState } from 'react'
import { Search, CheckCircle, XCircle } from 'lucide-react'

export default function CertificateVerify() {
    const [certId, setCertId] = useState('')
    const [status, setStatus] = useState('idle') // idle, loading, valid, invalid
    const [result, setResult] = useState(null)

    const handleVerify = async (e) => {
        e.preventDefault()
        if (!certId) return
        setStatus('loading')

        // Mock Verification Logc (Database table not ready)
        // In future: await supabase.from('certificates').select('*').eq('id', certId)

        await new Promise(resolve => setTimeout(resolve, 1500)) // Fake delay

        // Demo logic
        if (certId === 'DEMO-123') {
            setStatus('valid')
            setResult({
                student: 'John Doe',
                event: 'Coding Marathon',
                position: 'Winner',
                date: '2026-03-20'
            })
        } else {
            setStatus('invalid')
        }
    }

    return (
        <div className="bg-white py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-2xl text-center">
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Verify Certificate</h2>
                    <p className="mt-2 text-lg leading-8 text-gray-600">
                        Enter the unique certificate ID found on the document to verify its authenticity.
                    </p>

                    <form onSubmit={handleVerify} className="mt-10 mx-auto max-w-md flex gap-x-4">
                        <input
                            type="text"
                            required
                            value={certId}
                            onChange={(e) => setCertId(e.target.value)}
                            className="min-w-0 flex-auto rounded-md border-0 px-3.5 py-2 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary sm:text-sm sm:leading-6"
                            placeholder="Certificate ID (e.g. BH-2026-XYZ)"
                        />
                        <button
                            type="submit"
                            className="flex-none rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            Verify
                        </button>
                    </form>

                    {status === 'loading' && (
                        <div className="mt-10 text-gray-600">Verifying...</div>
                    )}

                    {status === 'valid' && result && (
                        <div className="mt-10 rounded-xl bg-green-50 p-6 ring-1 ring-inset ring-green-600/20">
                            <div className="flex items-center justify-center gap-x-2 text-green-700 font-semibold text-lg mb-4">
                                <CheckCircle className="h-6 w-6" />
                                Certificate Verified
                            </div>
                            <dl className="grid grid-cols-1 gap-x-8 gap-y-4 text-left sm:grid-cols-2">
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Student Name</dt>
                                    <dd className="text-lg font-semibold text-gray-900">{result.student}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Event</dt>
                                    <dd className="text-lg font-semibold text-gray-900">{result.event}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Achivement</dt>
                                    <dd className="text-lg font-semibold text-gray-900">{result.position}</dd>
                                </div>
                                <div>
                                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                                    <dd className="text-lg font-semibold text-gray-900">{result.date}</dd>
                                </div>
                            </dl>
                        </div>
                    )}

                    {status === 'invalid' && (
                        <div className="mt-10 rounded-xl bg-red-50 p-6 ring-1 ring-inset ring-red-600/20">
                            <div className="flex items-center justify-center gap-x-2 text-red-700 font-semibold text-lg">
                                <XCircle className="h-6 w-6" />
                                Invalid Certificate ID
                            </div>
                            <p className="mt-2 text-red-600">The certificate ID you entered does not exist in our records.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
