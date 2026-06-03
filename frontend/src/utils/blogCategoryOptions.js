import { blogCategories } from '../assets/assets'

/** Categories for create/edit forms (includes "All" for general/mixed posts). */
export const formBlogCategories = [...blogCategories]

export function buildCategoryOptions(currentCategory, suggestedCategory, extraSuggestions = []) {
  const options = [...formBlogCategories]
  const extras = [currentCategory, suggestedCategory, ...extraSuggestions]
  for (const extra of extras) {
    const c = String(extra || '').trim()
    if (c && !options.includes(c)) options.push(c)
  }
  return options
}
