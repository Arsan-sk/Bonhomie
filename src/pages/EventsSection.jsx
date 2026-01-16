import { useState } from 'react'

export default function EventsSection() {
    const [activeCategory, setActiveCategory] = useState(null)

    const data = {
        cultural: {
            title: 'Cultural Events',
            emoji: '🎭',
            tagline: 'Express • Perform • Create',
            events: [
                'Mehndi', 'Rangoli', 'Cooking Competition', 'Qirat', 'Treasure Hunt',
                'Hamd-O-Naat', 'Mushaira', 'Debate', 'Zaika', 'Extempore',
                'Short Film', 'Calligraphy', 'Pot Painting', 'Stand-up Comedy',
                'Doodling', 'Lippan Art', 'Speed Portrait', 'Beatboxing',
                'Vlog', 'Vernacular Speech'
            ]
        },
        sports: {
            title: 'Sports Events',
            emoji: '🏆',
            tagline: 'Compete • Sweat • Win',
            events: [
                'Chess', 'Carrom', 'Race 100M', 'Discus Throw', 'Shot Put',
                'Badminton', 'Push Up', 'Table Tennis', 'Cricket', 'Football',
                'Volleyball', 'Box Cricket', 'BGMI', 'Arm Wrestling',
                'Throw Ball', 'Relay Race', 'Tug of War', 'Three-Leg Race',
                'Free Fire', 'Valorant'
            ]
        },
        technical: {
            title: 'Technical Events',
            emoji: '💻',
            tagline: 'Innovate • Design • Build',
            events: [
                'AutoCAD',
                'Sustainable Development Poster Presentation'
            ]
        }
    }

    /* ---------- Small Components ---------- */

    const CategoryCard = ({ type }) => (
        <button
            onClick={() => setActiveCategory(type)}
            className="group relative w-full rounded-3xl bg-white/70 backdrop-blur-md
                       border border-white/40 shadow-lg p-10
                       hover:-translate-y-3 hover:shadow-2xl
                       transition-all duration-500 text-left"
        >
            <div className="text-4xl mb-4">{data[type].emoji}</div>
            <h3 className="text-2xl font-extrabold text-gray-900 group-hover:text-primary transition">
                {data[type].title}
            </h3>
            <p className="mt-2 text-gray-600">
                {data[type].tagline}
            </p>

            <div className="mt-6 h-1 w-12 bg-primary/40 group-hover:w-24 transition-all duration-500 rounded-full" />
        </button>
    )

    const EventCard = ({ title }) => (
        <div className="rounded-2xl bg-white/80 backdrop-blur-md
                        border border-white/40 shadow-md
                        hover:-translate-y-2 hover:shadow-xl
                        transition-all duration-300 p-6">
            <h4 className="text-lg font-semibold text-gray-800">
                {title}
            </h4>
        </div>
    )

    /* ---------- Views ---------- */

    return (
        <section className="relative py-24 bg-gradient-to-b from-white to-gray-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-8">

                {/* HEADER */}
                <div className="text-center mb-20">
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900">
                        Bonhomie 2026 Events
                    </h1>
                    <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
                        Choose a category and explore what awaits you.
                    </p>
                </div>

                {/* CATEGORY VIEW */}
                {!activeCategory && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">
                        <CategoryCard type="cultural" />
                        <CategoryCard type="sports" />
                        <CategoryCard type="technical" />
                    </div>
                )}

                {/* EVENTS VIEW */}
                {activeCategory && (
                    <div className="animate-slideUp">
                        <button
                            onClick={() => setActiveCategory(null)}
                            className="mb-10 inline-flex items-center gap-2
                                       text-sm font-semibold text-primary
                                       hover:underline"
                        >
                            ← Go Back
                        </button>

                        <h2 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-12">
                            {data[activeCategory].emoji} {data[activeCategory].title}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                            {data[activeCategory].events.map((event, i) => (
                                <EventCard key={i} title={event} />
                            ))}
                        </div>
                    </div>
                )}

            </div>
        </section>
    )
}
