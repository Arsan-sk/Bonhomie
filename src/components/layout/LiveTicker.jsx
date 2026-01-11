import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

export default function LiveTicker() {
    const [events, setEvents] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchLiveEvents = async () => {
            const { data } = await supabase
                .from('events')
                .select('name')
                .eq('is_active', true)
                .limit(5)
            if (data) setEvents(data)
            setLoading(false)
        }
        fetchLiveEvents()
    }, [])

    if (loading) return null

    return (
        <div className="bg-black text-white py-2 overflow-hidden whitespace-nowrap">
            <div className="inline-block animate-marquee">
                <span className="mx-4 font-bold text-red-500">● LIVE:</span>
                {events.length > 0 ? (
                    events.map((e, i) => (
                        <span key={i} className="mx-4 text-sm font-medium uppercase tracking-wider">
                            {e.name}
                        </span>
                    ))
                ) : (
                    <span className="mx-4 text-sm font-medium uppercase tracking-wider">
                        Welcome to Bonhomie 2026! Registrations are open!
                    </span>
                )}
            </div>
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                }
            `}</style>
        </div>
    )
}
