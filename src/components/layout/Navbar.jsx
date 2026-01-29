import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu, X, LogOut } from "lucide-react";
import { useEffect, useState } from "react";
import bonhomie_logo from "../../assets/bonhomie_logo.svg";
import clsx from "clsx";

export default function Navbar() {
  const { user, profile, signOut, isAdmin, isFaculty } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.warn('Logout error (ignored):', err);
    }
    // Always navigate to login
    navigate("/login");
  };

  const navLinks = [
    { name: "Events", path: "/events" },
    ...(user
      ? [
          {
            name: "Dashboard",
            path: isAdmin
              ? "/admin/dashboard"
              : isFaculty
                ? "/faculty/dashboard"
                : "/student/dashboard",
          },
        ]
      : []),
  ];

  /* 🔹 SCROLL TRANSPARENCY EFFECT */
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={clsx(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "backdrop-blur-xl bg-white/20 shadow-md"
          : "backdrop-blur-md bg-white/40",
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo Image */}
          <Link to="/" className="flex items-center group">
            <img
              src={bonhomie_logo}
              alt="Bonhomie Logo"
              className="
                                h-14 sm:h-16 w-auto
                                transition-transform duration-300 ease-out
                                group-hover:scale-110
                            "
            />
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className="relative text-sm font-semibold text-gray-900 transition-all duration-300
                                           after:absolute after:left-0 after:-bottom-1 after:h-[2px] after:w-0
                                           after:bg-primary after:transition-all after:duration-300
                                           hover:after:w-full hover:text-primary"
              >
                {link.name}
              </Link>
            ))}

            {user ? (
              <div className="flex items-center gap-4">
                <Link
                  to="/profile"
                  className="text-sm font-medium text-gray-900 hover:text-primary transition"
                >
                  {profile?.full_name || user.email}
                </Link>
                <button
                  onClick={handleSignOut}
                  className="p-2 rounded-full hover:bg-white/40 transition"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <Link
                  to="/login"
                  className="text-sm font-semibold text-gray-900 hover:text-primary transition"
                >
                  Login
                </Link>

                {/* Register Button */}
                <Link
                  to="/register"
                  className="relative overflow-hidden px-6 py-2 rounded-full
               border-2 border-primary
               text-primary font-semibold
               group"
                >
                  <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                    Register
                  </span>

                  {/* Center-fill background (keeps border visible) */}
                  <span
                    className="absolute inset-[2px] bg-primary rounded-full
                   origin-center scale-0
                   group-hover:scale-100
                   transition-transform duration-500 ease-out"
                  />
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-white/40 transition"
          >
            {isOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={clsx(
          "md:hidden overflow-hidden transition-all duration-300",
          isOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="px-4 pb-6 pt-3 space-y-2 bg-white/90 backdrop-blur-lg">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setIsOpen(false)}
              className="block px-4 py-3 rounded-xl text-gray-900 font-medium hover:bg-primary/10 transition"
            >
              {link.name}
            </Link>
          ))}

          {!user && (
            <>
              <Link
                to="/login"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-xl text-gray-900 hover:bg-primary/10 transition"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-3 rounded-xl bg-primary text-white text-center font-semibold shadow"
              >
                Register
              </Link>
            </>
          )}

          {user && (
            <button
              onClick={() => {
                handleSignOut();
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-3 rounded-xl text-gray-900 hover:bg-red-100 transition"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
