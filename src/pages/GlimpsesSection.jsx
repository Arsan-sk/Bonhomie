import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function GlimpsesSection() {
    const cardsRef = useRef([])

    useEffect(() => {
        const mm = gsap.matchMedia()

        /* =======================
           DESKTOP ANIMATION
        ======================== */
        mm.add('(min-width: 1024px)', () => {
            cardsRef.current.forEach((card, index) => {
                const fromX = index % 2 === 0 ? -100 : 100

                gsap.fromTo(
                    card,
                    {
                        opacity: 0,
                        x: fromX,
                        y: 40
                    },
                    {
                        opacity: 1,
                        x: 0,
                        y: 0,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 90%',
                            end: 'top 40%',
                            scrub: 1.8
                        }
                    }
                )
            })
        })

        /* =======================
           MOBILE & TABLET
        ======================== */
        mm.add('(max-width: 1023px)', () => {
            cardsRef.current.forEach(card => {
                gsap.fromTo(
                    card,
                    {
                        opacity: 0,
                        y: 60
                    },
                    {
                        opacity: 1,
                        y: 0,
                        ease: 'power2.out',
                        scrollTrigger: {
                            trigger: card,
                            start: 'top 85%',
                            end: 'top 60%',
                            scrub: 1.2
                        }
                    }
                )
            })
        })

        return () => mm.revert()
    }, [])

    const data = [
        {
            year: 'Bonhomie 2022',
            desc:
                'A grand comeback filled with energy, roaring crowds, and unforgettable performances that reignited the spirit of Bonhomie.',
            link: 'https://youtu.be/55GX9ODHhYM',
            embed: 'https://www.youtube.com/embed/55GX9ODHhYM?enablejsapi=1',
            bg: 'from-indigo-500/10 to-blue-500/10'
        },
        {
            year: 'Bonhomie 2020',
            desc:
                'A celebration of passion and creativity where cultural brilliance and technical excellence came together in harmony.',
            link: 'https://youtu.be/BchAr1ZcIJE',
            embed: 'https://www.youtube.com/embed/BchAr1ZcIJE?enablejsapi=1',
            bg: 'from-rose-500/10 to-pink-500/10'
        },
        {
            year: 'Bonhomie 2019',
            desc:
                'An explosion of talent, unity, and memories that defined what Bonhomie truly stands for.',
            link: 'https://youtu.be/t0bm5cGCHM4',
            embed: 'https://www.youtube.com/embed/t0bm5cGCHM4?enablejsapi=1',
            bg: 'from-emerald-500/10 to-teal-500/10'
        },
        {
            year: 'Bonhomie 2018',
            desc:
                'Where it all felt magical — raw energy, first cheers, and memories that still live in our hearts.',
            link: 'https://youtu.be/EcGkj8w4J1M',
            embed: 'https://www.youtube.com/embed/EcGkj8w4J1M?enablejsapi=1',
            bg: 'from-amber-500/10 to-orange-500/10'
        }
    ]

    const playVideo = iframe => {
        iframe?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'playVideo' }),
            '*'
        )
    }

    const pauseVideo = iframe => {
        iframe?.contentWindow?.postMessage(
            JSON.stringify({ event: 'command', func: 'pauseVideo' }),
            '*'
        )
    }

    return (
        <section className="py-24 sm:py-28 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                {/* Section Header */}
                <div className="text-center mb-20 sm:mb-24 lg:mb-28">
                    <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900">
                        Glimpses of the Past
                    </h2>
                    <p className="mt-4 sm:mt-5 text-base sm:text-lg text-gray-600 max-w-3xl mx-auto">
                        Relive the moments, emotions, and memories that shaped Bonhomie.
                    </p>
                </div>

                {/* Cards */}
                <div className="space-y-20 sm:space-y-24 lg:space-y-32">
                    {data.map((item, index) => {
                        const reverse = index % 2 !== 0

                        return (
                            <div
                                key={index}
                                ref={el => (cardsRef.current[index] = el)}
                                className={`flex flex-col lg:flex-row ${
                                    reverse ? 'lg:flex-row-reverse' : ''
                                } items-center gap-8 lg:gap-16 rounded-3xl
                                bg-gradient-to-br ${item.bg}
                                p-6 sm:p-8 lg:p-14
                                border border-white/40 shadow-xl`}
                            >
                                {/* Text */}
                                <div className="lg:w-1/2 w-full">
                                    <h3 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
                                        {item.year}
                                    </h3>
                                    <p className="mt-4 sm:mt-6 text-base sm:text-lg text-gray-700 leading-relaxed">
                                        {item.desc}
                                    </p>

                                    <a
                                        href={item.link}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-block mt-6 sm:mt-8 px-6 py-3 rounded-full
                                        bg-primary text-white font-semibold
                                        hover:scale-105 transition-all duration-300"
                                    >
                                        View Highlights
                                    </a>
                                </div>

                                {/* Video */}
                                <div
                                    className="lg:w-1/2 w-full rounded-2xl overflow-hidden shadow-2xl"
                                    onMouseEnter={e =>
                                        playVideo(e.currentTarget.querySelector('iframe'))
                                    }
                                    onMouseLeave={e =>
                                        pauseVideo(e.currentTarget.querySelector('iframe'))
                                    }
                                >
                                    <iframe
                                        className="w-full aspect-video"
                                        src={item.embed}
                                        title={item.year}
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>

            </div>
        </section>
    )
}
