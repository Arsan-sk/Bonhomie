import { Link } from 'react-router-dom'
import { Calendar, Users, Trophy } from 'lucide-react'

export default function Landing() {
    return (
        <div className="bg-white">
            {/* Hero Section */}
            <div className="relative isolate px-6 pt-14 lg:px-8">
                <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
                    <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
                        Bonhomie College Fest
                    </h1>
                    <p className="mt-6 text-lg leading-8 text-gray-600">
                        Join us for 6 days of cultural, technical, and sports events. Showcase your talent and win exciting prizes!
                    </p>
                    <div className="mt-10 flex items-center justify-center gap-x-6">
                        <Link
                            to="/events"
                            className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                            Explore Events
                        </Link>
                        <Link to="/register" className="text-sm font-semibold leading-6 text-gray-900">
                            Register Now <span aria-hidden="true">→</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Features Section */}
            <div className="py-24 sm:py-32 bg-gray-50">
                <div className="mx-auto max-w-7xl px-6 lg:px-8">
                    <div className="mx-auto max-w-2xl lg:text-center">
                        <h2 className="text-base font-semibold leading-7 text-primary">Everything you need</h2>
                        <p className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
                            Experience the best college fest
                        </p>
                    </div>
                    <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-4xl">
                        <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-10 lg:max-w-none lg:grid-cols-3 lg:gap-y-16">
                            <div className="relative pl-16">
                                <dt className="text-base font-semibold leading-7 text-gray-900">
                                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                        <Calendar className="h-6 w-6 text-white" aria-hidden="true" />
                                    </div>
                                    6 Days of Fun
                                </dt>
                                <dd className="mt-2 text-base leading-7 text-gray-600">
                                    Packed schedule with events ranging from dance and music to coding and robotics.
                                </dd>
                            </div>
                            <div className="relative pl-16">
                                <dt className="text-base font-semibold leading-7 text-gray-900">
                                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                        <Users className="h-6 w-6 text-white" aria-hidden="true" />
                                    </div>
                                    Team & Individual
                                </dt>
                                <dd className="mt-2 text-base leading-7 text-gray-600">
                                    Participate solo or form a team with your friends to compete.
                                </dd>
                            </div>
                            <div className="relative pl-16">
                                <dt className="text-base font-semibold leading-7 text-gray-900">
                                    <div className="absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                                        <Trophy className="h-6 w-6 text-white" aria-hidden="true" />
                                    </div>
                                    Exciting Prizes
                                </dt>
                                <dd className="mt-2 text-base leading-7 text-gray-600">
                                    Win cash prizes, trophies, and certificates for your achievements.
                                </dd>
                            </div>
                        </dl>
                    </div>
                </div>
            </div>
        </div>
    )
}
