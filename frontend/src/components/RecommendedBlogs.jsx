import React, { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import BlogCard from './BlogCard'
import { useAppContext } from '../context/AppContext'

const CardSkeleton = () => (
  <div className="rounded-lg overflow-hidden bg-white border border-gray-100 shadow-sm animate-pulse">
    <div className="w-full aspect-video bg-gray-200" />
    <div className="p-5 space-y-3">
      <div className="h-5 w-20 bg-gray-200 rounded-full" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-100 rounded w-5/6" />
    </div>
  </div>
)

const RecommendedBlogs = ({ blogId, category }) => {
  const { axios, blogs: allBlogs } = useAppContext()
  const [recBlogs, setRecBlogs] = useState(null) // null = loading, [] = ML returned nothing
  const [hasLoaded, setHasLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchRecommendations = async () => {
      setHasLoaded(false)
      setRecBlogs(null)
      try {
        const { data } = await axios.get(`/blog/${blogId}/recommendations?limit=4`)
        if (cancelled) return
        setRecBlogs(data.success && Array.isArray(data.blogs) ? data.blogs : [])
      } catch {
        if (!cancelled) setRecBlogs([])
      } finally {
        if (!cancelled) setHasLoaded(true)
      }
    }

    if (blogId) fetchRecommendations()
    return () => { cancelled = true }
  }, [blogId])

  const fallbackBlogs = (() => {
    if (!category) return []
    if (!Array.isArray(allBlogs)) return []
    return allBlogs
      .filter((b) => b?._id && b._id !== blogId && b.category === category)
      .slice(0, 4)
  })()

  const blogsToShow = recBlogs !== null && recBlogs.length > 0 ? recBlogs : fallbackBlogs

  // If ML finished but we don't yet have `allBlogs` from AppContext, keep the skeleton visible
  // instead of hiding the section abruptly.
  const allBlogsReady = Array.isArray(allBlogs)
  if (hasLoaded && blogsToShow.length === 0 && allBlogsReady) return null

  return (
    <section className="mt-16 mb-10 max-w-5xl mx-auto px-5">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">You might also like</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {recBlogs === null
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : (blogsToShow.length ? blogsToShow : Array.from({ length: 3 }))
              .map((blogOrUseless, i) => (
            <motion.div
              key={blogOrUseless?._id || `skeleton-${i}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {blogOrUseless ? <BlogCard blog={blogOrUseless} /> : <CardSkeleton />}
            </motion.div>
          ))}
      </div>
    </section>
  )
}

export default RecommendedBlogs
