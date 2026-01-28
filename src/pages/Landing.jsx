import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { Calendar, Users, Trophy } from "lucide-react";
import bonhomieVideo from "../assets/bh_background.mp4";
import EventsSection from "../pages/EventsSection.jsx";
import GlimpsesSection from "../pages/GlimpsesSection.jsx";
import Incharge from "../pages/Incharge.jsx";

export default function Landing() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  // Redirect logged-in users to their dashboard
  useEffect(() => {
    if (!loading && user && profile) {
      const role = profile.role;
      if (role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else if (role === 'coordinator') {
        navigate('/coordinator/dashboard', { replace: true });
      } else if (role === 'student') {
        navigate('/student/dashboard', { replace: true });
      }
    }
  }, [user, profile, loading, navigate]);

  // Show nothing while checking auth status
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white">
        {/* Hero Section */}
        <div className="relative isolate px-6 pt-14 lg:px-8 overflow-hidden">
          {/* Background Video */}
          <video
            className="absolute inset-0 w-full h-full object-cover -z-10"
            src={bonhomieVideo}
            autoPlay
            loop
            muted
            playsInline
          />

          {/* Optional overlay for readability */}
          <div className="absolute inset-0 bg-black/40 -z-10"></div>

          <div className="mx-auto max-w-2xl py-32 sm:py-48 lg:py-56 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Bonhomie 2K26
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-200">
              Join us for 6 days of cultural, technical, and sports events.
              Showcase your talent and win exciting prizes!
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link
                to="/events"
                className="text-sm font-semibold leading-6 text-white"
              >
                Explore Events
              </Link>
              <Link
                to="/register"
                
                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Register Now <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        
      </div>
      <EventsSection />
      <GlimpsesSection />
      <Incharge />
    </>
  );
}
