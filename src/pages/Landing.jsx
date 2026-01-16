import { Link } from "react-router-dom";
import { Calendar, Users, Trophy } from "lucide-react";
import bonhomieVideo from "../assets/bonhomie2k19.mp4";
import EventsSection from "../pages/EventsSection.jsx";
import GlimpsesSection from "../pages/GlimpsesSection.jsx";
import Incharge from "../pages/Incharge.jsx";

export default function Landing() {
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
                className="rounded-md bg-primary px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                Explore Events
              </Link>
              <Link
                to="/register"
                className="text-sm font-semibold leading-6 text-white"
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
