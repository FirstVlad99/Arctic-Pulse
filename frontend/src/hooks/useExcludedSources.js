// src/hooks/useExcludedSources.js
import { useState, useEffect } from 'react'
import { getAllSourceStatuses } from '../api/indexedDB'

export const useExcludedSources = () => {
  const [excludedSourceNames, setExcludedSourceNames] = useState([])
  const [excludedSourceIds, setExcludedSourceIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadExcludedSources = async () => {
      try {
        const statuses = await getAllSourceStatuses()
        const excluded = statuses.filter(s => s.status === 'inactive')
        
        // Сохраняем ID для API запросов (если нужно)
        setExcludedSourceIds(excluded.map(s => s.id))
        
        // Сохраняем названия для фильтрации в API
        const sourceNameMap = {
          1: 'ТАСС',
          2: 'РИА Новости',
          3: 'Коммерсантъ',
          4: 'Арктический совет',
          5: 'North News',
          6: 'High North News',
        }
        
        const excludedNames = excluded.map(s => sourceNameMap[s.id]).filter(Boolean)
        setExcludedSourceNames(excludedNames)
      } catch (error) {
        console.error('Error loading excluded sources:', error)
      } finally {
        setLoading(false)
      }
    }
    loadExcludedSources()
  }, [])

  return { excludedSourceNames, excludedSourceIds, loading }
}