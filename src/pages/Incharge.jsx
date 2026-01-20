import nusrath from '../assets/nusrath.png'
import irfan from '../assets/irfan.png'
import shahbaz from '../assets/shahbaz.png'
import shahin from '../assets/shahin.png'

export default function Incharge() {
    const faculty = [
        {
            name: 'Nusrath Junaidi',
            role: 'COST, In-Charge',
            img: nusrath
        },
        {
            name: 'Shabaz Haque',
            role: 'COST, Advisor',
            img: shahbaz
        },
        {
            name: 'Irfan Jamkhandikar',
            role: 'Sports, In-Charge',
            img: irfan
        },
        {
            name: 'Shahin Momin',
            role: 'Cultural Co Ordinator',
            img: shahin
        }
    ]

    return (
        <section className="relative py-28 bg-gradient-to-b from-white to-white overflow-hidden">
            {/* subtle background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255),transparent_60%)]" />

            <div className="relative max-w-7xl mx-auto px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-24">
                    <h2 className="text-4xl sm:text-5xl font-extrabold text-black">
                        Faculty In-Charges
                    </h2>
                    <p className="mt-5 text-lg text-black max-w-3xl mx-auto">
                        Guiding Bonhomie with wisdom, leadership, and unwavering dedication.
                    </p>
                </div>

                {/* Cards Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-x-24 gap-y-20 place-items-center">
                    {faculty.map((person, index) => (
                        <div
                            key={index}
                            className="group text-center"
                        >
                            {/* Image */}
                            <div
                                className="relative w-56 h-56 rounded-full overflow-hidden
                                           ring-4 ring-white/10
                                           transition-all duration-500
                                           group-hover:ring-primary/60
                                           group-hover:shadow-[0_0_60px_rgba(56,189,248,0.55)]"
                            >
                                <img
                                    src={person.img}
                                    alt={person.name}
                                    className="w-full h-full object-cover
                                               transition-transform duration-700
                                               group-hover:scale-110"
                                />
                            </div>

                            {/* Name */}
                            <h3 className="mt-8 text-xl font-bold text-black">
                                {person.name}
                            </h3>

                            {/* Role */}
                            <p className="mt-2 text-sm tracking-wide text-black">
                                {person.role}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
