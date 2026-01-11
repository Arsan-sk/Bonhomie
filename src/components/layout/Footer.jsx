import { Link } from 'react-router-dom'

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-200 mt-auto">
            <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-2">
                <div className="flex gap-4 text-sm text-gray-500">
                    <Link to="/verify" className="hover:text-primary">Verify Certificate</Link>
                    <span>•</span>
                    <Link to="/events" className="hover:text-primary">Events</Link>
                </div>
                <p className="text-sm text-gray-500">
                    &copy; {new Date().getFullYear()} Bonhomie College Fest. All rights reserved.
                </p>
            </div>
        </footer>
    )
}
