import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
} from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
)

export default function AdminAnalytics() {
    const [loading, setLoading] = useState(true)
    const [registrationData, setRegistrationData] = useState(null)
    const [categoryData, setCategoryData] = useState(null)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            // Fetch Events and Registration Counts
            const { data: events, error: eventsError } = await supabase
                .from('events')
                .select('id, name, category, fee')
            if (eventsError) throw eventsError

            // Fetch Registrations (mocking count for now if no real data, or fetch actual)
            // Ideally we need aggregate queries. Supabase doesn't do 'GROUP BY' easily with client.
            // We'll fetch all registrations and process in JS (fine for < 10k records prototype).
            const { data: registrations, error: regError } = await supabase
                .from('registrations')
                .select('event_id')
                .eq('status', 'confirmed')

            if (regError) throw regError

            // Process Data for Bar Chart (Registrations per Event)
            const regCounts = {}
            registrations.forEach(r => {
                regCounts[r.event_id] = (regCounts[r.event_id] || 0) + 1
            })

            const eventNames = events.map(e => e.name)
            const eventCounts = events.map(e => regCounts[e.id] || 0)

            setRegistrationData({
                labels: eventNames,
                datasets: [
                    {
                        label: 'Confirmed Registrations',
                        data: eventCounts,
                        backgroundColor: 'rgba(53, 162, 235, 0.5)',
                        borderColor: 'rgb(53, 162, 235)',
                        borderWidth: 1,
                    },
                ],
            })

            // Process Data for Pie Chart (Events by Category)
            const catCounts = {}
            events.forEach(e => {
                catCounts[e.category] = (catCounts[e.category] || 0) + 1
            })

            setCategoryData({
                labels: Object.keys(catCounts),
                datasets: [
                    {
                        label: '# of Events',
                        data: Object.values(catCounts),
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.5)',
                            'rgba(54, 162, 235, 0.5)',
                            'rgba(255, 206, 86, 0.5)',
                            'rgba(75, 192, 192, 0.5)',
                        ],
                        borderWidth: 1,
                    },
                ],
            })

        } catch (error) {
            console.error('Analytics Error:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 text-center">Loading Analytics...</div>

    return (
        <div className="space-y-8">
            <h1 className="text-2xl font-bold text-gray-900">Analytics & Insights</h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Bar Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border">
                    <h3 className="text-lg font-medium mb-4 text-center">Registrations per Event</h3>
                    {registrationData && <Bar options={{ responsive: true }} data={registrationData} />}
                </div>

                {/* Pie Chart */}
                <div className="bg-white p-6 rounded-lg shadow-sm border flex flex-col items-center">
                    <h3 className="text-lg font-medium mb-4 text-center">Events Distribution by Category</h3>
                    <div className="w-2/3">
                        {categoryData && <Pie data={categoryData} />}
                    </div>
                </div>
            </div>
        </div>
    )
}
