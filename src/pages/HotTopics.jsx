/**
 * HotTopics - Landing page for Hot Topics section
 * Lists special event features like Zaika
 */

import { Link } from 'react-router-dom'
import { Flame, UtensilsCrossed, ChevronRight, Sparkles } from 'lucide-react'

export default function HotTopics() {
  const topics = [
    {
      id: 'zaika',
      name: 'Zaika',
      description: 'Digital Food Festival Wallet - Order food from stalls, manage your wallet, and enjoy the culinary experience!',
      icon: UtensilsCrossed,
      href: 'zaika',
      color: 'from-orange-500 to-amber-500',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      available: true,
      badge: 'Live',
    },
    // Add more hot topics here as they become available
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4 shadow-lg">
          <Flame className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Hot Topics</h1>
        <p className="text-gray-600 mt-2">Explore special features and events</p>
      </div>

      {/* Topics Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {topics.map((topic) => {
          const Icon = topic.icon
          
          if (!topic.available) {
            return (
              <div
                key={topic.id}
                className={`p-6 rounded-2xl border-2 border-dashed ${topic.borderColor} ${topic.bgColor} opacity-60`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${topic.color} shadow-md`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-gray-900">{topic.name}</h3>
                      <span className="px-2 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                        Coming Soon
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mt-1">{topic.description}</p>
                  </div>
                </div>
              </div>
            )
          }

          return (
            <Link
              key={topic.id}
              to={topic.href}
              className={`group p-6 rounded-2xl border ${topic.borderColor} ${topic.bgColor} hover:shadow-lg hover:scale-[1.02] transition-all duration-300`}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl bg-gradient-to-br ${topic.color} shadow-md group-hover:shadow-lg transition-shadow`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{topic.name}</h3>
                    {topic.badge && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                        <Sparkles className="h-3 w-3" />
                        {topic.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 text-sm mt-1">{topic.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 group-hover:translate-x-1 transition-all" />
              </div>
            </Link>
          )
        })}
      </div>

      {/* Empty State for when no topics */}
      {topics.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
          <Flame className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No hot topics available yet</p>
          <p className="text-sm text-gray-400">Check back soon!</p>
        </div>
      )}
    </div>
  )
}
