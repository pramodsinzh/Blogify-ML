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

const RecommendedBlogs = ({ blogId }) => {
  const { axios } = useAppContext()
  const [blogs, setBlogs] = useState(null)

  useEffect(() => {
    let cancelled = false

    const fetchRecommendations = async () => {
      setBlogs(null)
      try {
        const { data } = await axios.get(`/blog/${blogId}/recommendations?limit=4`)
        if (cancelled) return
        setBlogs(data.success && Array.isArray(data.blogs) ? data.blogs : [])
      } catch {
        if (!cancelled) setBlogs([])
      }
    }

    if (blogId) fetchRecommendations()
    return () => { cancelled = true }
  }, [blogId])

  if (blogs !== null && blogs.length === 0) return null

  return (
    <section className="mt-16 mb-10 max-w-5xl mx-auto px-5">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">You might also like</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {blogs === null
          ? Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)
          : blogs.map((blog) => (
            <motion.div
              key={blog._id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <BlogCard blog={blog} />
            </motion.div>
          ))}
      </div>
    </section>
  )
}

export default RecommendedBlogs
