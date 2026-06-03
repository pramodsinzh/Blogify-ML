import React, { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { useAppContext } from '../context/AppContext'

const toPlainText = (html = '') =>
  html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const CategoryAiSuggestion = ({
  title,
  subTitle = '',
  content,
  contentRevision = 0,
  category,
  onCategoryChange,
  onSuggestion,
  onTopPredictions,
}) => {
  const { axios } = useAppContext()
  const [topPredictions, setTopPredictions] = useState([])
  const [loading, setLoading] = useState(false)
  const [unavailable, setUnavailable] = useState(false)
  const requestIdRef = useRef(0)

  useEffect(() => {
    const plain = toPlainText(content)
    const textLen = (title || '').trim().length + (subTitle || '').trim().length + plain.length

    if (textLen < 20) {
      setTopPredictions([])
      setUnavailable(false)
      setLoading(false)
      return
    }

    const requestId = ++requestIdRef.current
    setLoading(true)

    const timer = setTimeout(async () => {
      try {
        const { data } = await axios.post('/blog/predict-category', {
          title: title || '',
          content: content || '',
        })

        if (requestId !== requestIdRef.current) return

        if (data.success) {
          const list =
            Array.isArray(data.topPredictions) && data.topPredictions.length
              ? data.topPredictions
              : data.predictedCategory
                ? [{ category: data.predictedCategory, confidence: data.confidence }]
                : []

          const top3 = list.slice(0, 3)
          setTopPredictions(top3)
          onSuggestion?.(top3[0]?.category)
          onTopPredictions?.(top3)
        } else {
          setTopPredictions([])
        }
      } catch (err) {
        if (requestId !== requestIdRef.current) return
        setTopPredictions([])
        if (err.response?.status === 503) setUnavailable(true)
      } finally {
        if (requestId === requestIdRef.current) setLoading(false)
      }
    }, 700)

    return () => clearTimeout(timer)
  }, [title, subTitle, content, contentRevision, axios])

  const handleApply = (cat) => {
    if (!cat || !onCategoryChange) return
    const next = String(cat).trim()
    onCategoryChange(next)
    toast.success(`Category set to ${next}`)
  }

  if (unavailable) {
    return (
      <p className="mt-2 text-xs text-gray-500">
        AI category suggestion unavailable. Run training:{' '}
        <code className="text-primary">python train_model.py</code> or open{' '}
        <code className="text-primary">train_model.ipynb</code>.
      </p>
    )
  }

  if (!loading && topPredictions.length === 0) return null

  return (
    <div className="mt-3 p-3 rounded-lg border border-primary/25 bg-primary/5 text-sm max-w-lg">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium text-primary">AI Suggested Categories</p>
        {loading && (
          <span className="text-xs text-gray-500 animate-pulse">Updating...</span>
        )}
      </div>

      <ul className={`mt-2 space-y-2 ${loading ? 'opacity-70' : ''}`}>
        {topPredictions.map((item, index) => {
          const cat = String(item.category || '').trim()
          const confidencePct = Math.round((item.confidence || 0) * 100)
          const isApplied = category && category.trim() === cat

          return (
            <li
              key={`${cat}-${index}-${confidencePct}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white/60 px-3 py-2 border border-primary/10"
            >
              <div>
                <span className="text-gray-800 font-medium">{cat}</span>
                <span className="text-gray-500 ml-2">({confidencePct}% confidence)</span>
                {index === 0 && (
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-primary font-semibold">
                    Top match
                  </span>
                )}
              </div>
              {onCategoryChange && (
                <button
                  type="button"
                  onClick={() => handleApply(cat)}
                  disabled={isApplied}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer disabled:opacity-60 disabled:cursor-default shrink-0"
                >
                  {isApplied ? 'Applied' : 'Use'}
                </button>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default CategoryAiSuggestion
