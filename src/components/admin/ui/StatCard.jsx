import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'

export default function StatCard({ title, value, trend, trendValue, icon: Icon, color = 'indigo' }) {
    const isPositive = trend === 'up'
    const isNegative = trend === 'down'
    const isNeutral = trend === 'neutral'

    const colors = {
        indigo: 'bg-indigo-500',
        emerald: 'bg-emerald-500',
        amber: 'bg-amber-500',
        rose: 'bg-rose-500',
        desktopDefault: 'text-indigo-600'
    }

    return (
        <div className="relative overflow-hidden rounded-xl bg-white p-6 shadow-sm ring-1 ring-gray-900/5 transition-all hover:shadow-md">
            <dt>
                <div className={`absolute rounded-md p-3 ${colors[color] || colors.indigo} bg-opacity-10`}>
                    <Icon className={`h-6 w-6 ${color === 'indigo' ? 'text-indigo-600' : color === 'emerald' ? 'text-emerald-600' : color === 'amber' ? 'text-amber-600' : 'text-rose-600'}`} aria-hidden="true" />
                </div>
                <p className="ml-16 truncate text-sm font-medium text-gray-500">{title}</p>
            </dt>
            <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                <p className="text-2xl font-semibold text-gray-900">{value}</p>

                {trendValue && (
                    <p className={`ml-2 flex items-baseline text-sm font-semibold ${isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
                        }`}>
                        {isPositive && <ArrowUpRight className="h-4 w-4 flex-shrink-0 self-center text-green-500" aria-hidden="true" />}
                        {isNegative && <ArrowDownRight className="h-4 w-4 flex-shrink-0 self-center text-red-500" aria-hidden="true" />}
                        {isNeutral && <Minus className="h-4 w-4 flex-shrink-0 self-center text-gray-500" aria-hidden="true" />}
                        <span className="sr-only"> {isPositive ? 'Increased' : isNegative ? 'Decreased' : 'No change'} by </span>
                        {trendValue}
                    </p>
                )}
            </dd>
        </div>
    )
}
