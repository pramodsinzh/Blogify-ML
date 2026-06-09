import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { BookOpen, Home, MessageCircle, Search } from 'lucide-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { assets } from '../assets/assets'

const digitVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, ease: 'easeOut' },
  }),
}

const quickLinks = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/see-all-blogs', label: 'All Blogs', icon: BookOpen },
  { to: '/contact', label: 'Contact', icon: MessageCircle },
]

const NotFound = () => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <>
      <Navbar />

      <main className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden px-6 md:px-16 lg:px-24 xl:px-32 py-16 md:py-24">
        <img
          src={assets.gradientBackground}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 w-full max-w-5xl opacity-45 pointer-events-none select-none"
        />

        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl -z-10"
          aria-hidden
        />
        <div
          className="absolute -bottom-32 -left-20 w-80 h-80 rounded-full bg-teal-200/30 blur-3xl -z-10"
          aria-hidden
        />

        <div className="text-center max-w-2xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            className="flex items-center justify-center gap-2 sm:gap-4 mb-6"
          >
            {['4', '0', '4'].map((digit, i) => (
              <motion.span
                key={digit + i}
                custom={i}
                variants={digitVariants}
                className={`text-7xl sm:text-9xl font-bold leading-none ${
                  i === 1 ? 'text-primary' : 'text-gray-800'
                }`}
              >
                {digit}
              </motion.span>
            ))}
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-2xl sm:text-3xl font-semibold text-gray-900 mb-3"
          >
            Page not found
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="text-gray-500 text-base sm:text-lg leading-relaxed mb-6"
          >
            The page you&apos;re looking for doesn&apos;t exist or may have been moved.
            Let&apos;s get you back to something worth reading.
          </motion.p>

          {location.pathname !== '/' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.55, duration: 0.4 }}
              className="inline-flex items-center gap-2 px-4 py-2 mb-8 rounded-full bg-gray-100 border border-gray-200 text-sm text-gray-500 font-mono max-w-full"
            >
              <Search className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="truncate">{location.pathname}</span>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-10"
          >
            <motion.button
              type="button"
              onClick={() => navigate('/')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg bg-gradient-to-r from-primary to-teal-800 text-white font-semibold shadow-md hover:from-teal-800 hover:to-primary transition-all duration-300 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Back to Home
            </motion.button>

            <motion.button
              type="button"
              onClick={() => navigate('/see-all-blogs')}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3 rounded-lg border border-gray-300 bg-white text-gray-700 font-semibold shadow-sm hover:border-primary hover:text-primary transition-colors duration-300 cursor-pointer"
            >
              <BookOpen className="w-4 h-4" />
              Browse Blogs
            </motion.button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.75, duration: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm"
          >
            {quickLinks.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className="text-gray-500 hover:text-primary transition-colors duration-200"
              >
                {label}
              </Link>
            ))}
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  )
}

export const AdminNotFound = () => {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md"
      >
        <p className="text-6xl font-bold text-primary mb-2">404</p>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Admin page not found</h2>
        <p className="text-gray-500 text-sm mb-1">
          <span className="font-mono text-gray-400">{location.pathname}</span> doesn&apos;t exist.
        </p>
        <p className="text-gray-500 text-sm mb-6">Head back to the dashboard to continue managing Blogify.</p>
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors cursor-pointer"
        >
          <Home className="w-4 h-4" />
          Go to Dashboard
        </button>
      </motion.div>
    </div>
  )
}

export default NotFound
