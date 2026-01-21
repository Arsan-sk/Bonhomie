import { Facebook, Instagram, Phone, Mail } from 'lucide-react'
import { Link } from 'react-router-dom';

export default function Footer() {
    return (
        <footer className="bg-[#3f3f3f] text-white">
            {/* Main Footer */}
            <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

                {/* Brand */}
                <div>
                    <h2 className="text-3xl font-extrabold tracking-wide mb-4">
                        BONHOMIE
                    </h2>
                    <p className="text-gray-300 text-sm leading-relaxed">
                        Designed and Developed by the <br />
                        <span className="font-semibold text-white">
                            Technical Team, SoET
                        </span>
                    </p>
                </div>

                {/* Events */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">EVENTS</h3>
                    <ul className="space-y-3 text-gray-300 text-sm">
                        {['Sports', 'Cultural', 'Technical'].map(item => (
                            <li key={item}>
                                <Link
                                    to="/events"
                                    className="inline-block relative
                                    after:absolute after:left-0 after:-bottom-0.5
                                    after:h-[1.5px] after:w-0 after:bg-white
                                    after:transition-all after:duration-300
                                    hover:after:w-full hover:text-white transition"
                                >
                                    {item}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Glimpse */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">GLIMPSE</h3>
                    <ul className="space-y-3 text-gray-300 text-sm">
                        {['Photos', 'Videos', 'Help'].map(item => (
                            <li key={item}>
                                <a
                                    href="#top"
                                    className="inline-block relative
                                    after:absolute after:left-0 after:-bottom-0.5
                                    after:h-[1.5px] after:w-0 after:bg-white
                                    after:transition-all after:duration-300
                                    hover:after:w-full hover:text-white transition"
                                >
                                    {item}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h3 className="text-lg font-semibold mb-4">CONTACT</h3>
                    <div className="space-y-3 text-gray-300 text-sm">
                        <div className="flex items-center gap-3">
                            <Mail size={16} />
                            23ec23@aiktc.ac.in 23ds33@aiktc.ac.in
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone size={16} />
                            +91 93263 83639
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone size={16} />
                            +91 74000 48628
                        </div>
                    </div>
                </div>
            </div>

            {/* Map */}
            <div className="max-w-7xl mx-auto px-6 pb-12">
                <div className="rounded-xl overflow-hidden border border-white/10 shadow-lg">
                    <iframe
                        title="AIKTC Location"
                        src="https://www.google.com/maps?q=Anjuman-I-Islam%20Kalsekar%20Technical%20Campus&output=embed"
                        className="w-full h-[260px]"
                        loading="lazy"
                    />
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="border-t border-white/10">
                <div className="max-w-7xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4">

                    <p className="text-sm text-gray-300">
                        © {new Date().getFullYear()} Copyright: AIKTC
                    </p>

                    {/* Social Icons */}
                    <div className="flex items-center gap-4">

                        {/* Facebook */}
                        <Link to="https://www.facebook.com/aiktcofficial/" target="_blank" rel="noopener noreferrer" className="group relative w-10 h-10 rounded-full border border-white/30
                                       flex items-center justify-center overflow-hidden">
                            <span className="absolute inset-0 bg-blue-600 scale-0 group-hover:scale-100
                                             transition-transform duration-300 rounded-full" />
                            <Facebook className="relative z-10 text-white" size={18} />
                        </Link>

                        {/* WhatsApp (RESTORED ICON) */}
                        <Link to="https://chat.whatsapp.com/IfOGcKECmzjEIa5nW0oTuU" target="_blank" className="group relative w-10 h-10 rounded-full border border-white/30
                                       flex items-center justify-center overflow-hidden">
                            <span className="absolute inset-0 bg-green-500 scale-0 group-hover:scale-100
                                             transition-transform duration-300 rounded-full" />
                            <svg
                                className="relative z-10 fill-white"
                                width="18"
                                height="18"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12.04 2.01c-5.5 0-9.98 4.48-9.98 9.98 0 1.76.46 3.48 1.34 5.02L2 22l5.11-1.33a9.93 9.93 0 0 0 4.93 1.3h.01c5.5 0 9.98-4.48 9.98-9.98s-4.48-9.98-9.99-9.98zm5.79 14.54c-.24.67-1.4 1.27-1.92 1.35-.52.09-1.17.13-1.89-.12-.43-.14-.98-.32-1.69-.63-2.97-1.29-4.9-4.25-5.05-4.45-.15-.2-1.21-1.61-1.21-3.07s.77-2.17 1.04-2.47c.27-.3.6-.37.8-.37h.58c.19 0 .44-.07.69.53.25.6.85 2.07.92 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.32.4-.45.54-.15.15-.3.31-.13.61.17.3.76 1.25 1.64 2.03 1.13.99 2.08 1.3 2.38 1.45.3.15.47.13.65-.08.18-.21.75-.88.95-1.18.2-.3.4-.25.67-.15.27.1 1.71.81 2.01.96.3.15.5.22.57.35.07.13.07.75-.17 1.42z" />
                            </svg>
                        </Link>

                        {/* Instagram */}
                        <Link to="https://www.instagram.com/bonhomie_aiktc/" target="_blank" rel="noopener noreferrer" className="group relative w-10 h-10 rounded-full border border-white/30
                                       flex items-center justify-center overflow-hidden">
                            <span className="absolute inset-0 bg-pink-500 scale-0 group-hover:scale-100
                                             transition-transform duration-300 rounded-full" />
                            <Instagram className="relative z-10 text-white" size={18} />
                        </Link>

                    </div>
                </div>
            </div>
        </footer>
    )
}
