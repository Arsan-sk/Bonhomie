import Navbar from './Navbar'
import Footer from './Footer'
import LiveTicker from './LiveTicker'

export default function Layout({ children }) {
    return (
        <div className="min-h-screen flex flex-col bg-gray-50">
            <LiveTicker />
            <Navbar />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
        </div>
    )
}
