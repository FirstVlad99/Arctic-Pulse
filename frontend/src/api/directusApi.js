import axios from 'axios'

// const DIRECTUS_URL = 'http://localhost:8055';
const DIRECTUS_URL = '/api' || 'http://localhost:8055';
console.log('Directus API URL:', DIRECTUS_URL)

export const directusApi = axios.create({
  baseURL: `${DIRECTUS_URL}/items`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
})


/* ================= LOGS ================= */

directusApi.interceptors.request.use(config => {
  console.log('API Request:', config.method.toUpperCase(), config.url)
  return config
})

directusApi.interceptors.response.use(
  response => {
    console.log('API Response:', response.status, response.config.url)
    return response
  },
  error => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

/* ================= NEWS ================= */

export const getNews = async (params) => {
  const {
    page = 1,
    limit = 20,
    sort = '-publication_date',
    filters = {}
  } = params

  const filterRules = []

  if (filters.search) {
    filterRules.push({ title: { _icontains: filters.search } })
  }

  if (filters.dateFrom && filters.dateTo) {
    filterRules.push({
      publication_date: {
        _between: [filters.dateFrom, filters.dateTo]
      }
    })
  }

  if (filters.sources?.length) {
    filterRules.push({
      source_id: { name: { _in: filters.sources } }
    })
  }

  if (filters.excludedSources?.length) {
    filterRules.push({
      source_id: { name: { _nin: filters.excludedSources } }
    })
  }

  if (filters.categories?.length) {
    filterRules.push({
      tags: {
        tags_id: {
          name: { _in: filters.categories }
        }
      }
    })
  }

  // Only arctic news should be requested
  filterRules.push({ is_arctic: { _eq: true } })

  const filter = filterRules.length ? { _and: filterRules } : undefined

  const response = await directusApi.get('/news', {
    params: {
      page,
      limit,
      sort,
      filter: filter ? JSON.stringify(filter) : undefined,

      /* FIX: убрали JSON.stringify */
      fields:
        'id,title,content_clean,news_url,publication_date,relevance_score,is_arctic,source_id.id,source_id.name,source_id.rating,source_id.website_url,created_at',

      deep: JSON.stringify({
        tags: { _limit: -1 }
      })
    }
  })

  return response.data
}

/* ================= NEWS BY ID ================= */

export const getNewsById = async (id) => {
  const response = await directusApi.get('/news', {
    params: {
      filter: JSON.stringify({
        _and: [
          { id: { _eq: id } },
          { is_arctic: { _eq: true } }
        ]
      }),
      limit: 1,
      fields:
        'id,title,content,content_clean,news_url,publication_date,material_author,relevance_score,summary_ai,source_id.id,source_id.name,source_id.rating,source_id.website_url,created_at,updated_at'
    }
  })

  return response.data.data?.[0] || null
}

/* ================= SOURCES ================= */

export const getSources = async () => {
  const response = await directusApi.get('/sources', {
    params: {
      sort: 'name',
      limit: 100,

      /* FIX */
      fields:
        'id,name,rss_url,website_url,rating,likes_count,dislikes_count,is_active,last_fetched,notes,created_at'
    }
  })

  return response.data
}

export const fetchSources = async () => {
  const { data } = await directusApi.get('/sources', {
    params: {
      sort: '-rating',
      limit: 100,
      fields:
        'id,name,rss_url,website_url,rating,likes_count,dislikes_count,is_active,last_fetched'
    }
  })

  return data
}

export const fetchSourcesRelevance = async () => {
  const { data } = await directusApi.get('/sources', {
    params: {
      limit: 100,
      fields: 'id,rating'
    }
  })

  return data
}

export const fetchSourceRelevance = async (sourceId) => {
  const { data } = await directusApi.get(`/sources/${sourceId}`, {
    params: {
      fields: 'id,is_relevant'
    }
  })

  return data
}

export const updateSourceStatus = async (sourceId, status) => {
  const { data } = await directusApi.patch(`/sources/${sourceId}`, {
    is_active: status === 'active'
  })

  return data
}

export const fetchDigests = () => {
  return directusApi.get('/digests')
}

export const fetchNewsBatch = (ids) => {
  return directusApi.get('/news', {
    params: {
      filter: JSON.stringify({
        _and: [
          { id: { _in: ids } },
          { is_arctic: { _eq: true } }
        ]
      }),
      limit: -1
    }
  })
}

/**
 * digest_news + join news
 */
export const fetchDigestNews = (params = {}) => {
  return directusApi.get('/digest_news', {
    params: {
      fields: params.fields?.join(',') || '*,news_id.*',
      sort: 'position',
      limit: -1
    }
  })
}

export const fetchActiveSources = async () => {
  const { data } = await directusApi.get('/sources', {
    params: {
      filter: JSON.stringify({
        is_active: { _eq: true }
      }),
      fields: 'id,name,website_url',
      limit: 100
    }
  })

  return data
}

export const getDigestById = async (id) => {
  const { data } = await directusApi.get(`/digests/${id}`, {
    params: {
      fields: '*'
    }
  })

  return data
}

export const getDigestNews = async (digestId) => {
  const { data } = await directusApi.get('/digest_news', {
    params: {
      filter: JSON.stringify({
        digest_id: { _eq: digestId }
      }),
      sort: 'position',
      limit: -1,
      fields: 'id,position,news_id.*'
    }
  })

  return data
}

/* ================= TAGS ================= */

export const getTags = async () => {
  const response = await directusApi.get('/tags', {
    params: {
      sort: 'name',

      /* FIX */
      fields: 'id,name,description,color,usage_count'
    }
  })

  return response.data
}

/* ================= STATS ================= */

export const updateNewsLikes = async (newsId, likes) => {
  const existing = await directusApi.get('/news_stats', {
    params: {
      filter: JSON.stringify({
        news_id: { _eq: newsId }
      })
    }
  })

  const row = existing.data?.data?.[0]

  if (row) {
    const { data } = await directusApi.patch(`/news_stats/${row.id}`, {
      likes_count: likes
    })
    return data
  }

  const { data } = await directusApi.post('/news_stats', {
    news_id: newsId,
    likes_count: likes,
    dislikes_count: 0
  })

  return data
}

export const updateNewsDislikes = async (newsId, dislikes) => {
  const existing = await directusApi.get('/news_stats', {
    params: {
      filter: JSON.stringify({
        news_id: { _eq: newsId }
      })
    }
  })

  const row = existing.data?.data?.[0]

  if (row) {
    const { data } = await directusApi.patch(`/news_stats/${row.id}`, {
      dislikes_count: dislikes
    })
    return data
  }

  const { data } = await directusApi.post('/news_stats', {
    news_id: newsId,
    likes_count: 0,
    dislikes_count: dislikes
  })

  return data
}

export const updateNewsStats = async (newsId, likes, dislikes) => {
  const existing = await directusApi.get('/news_stats', {
    params: {
      filter: JSON.stringify({
        news_id: { _eq: newsId }
      })
    }
  })

  const row = existing.data?.data?.[0]

  if (row) {
    return directusApi.patch(`/news_stats/${row.id}`, {
      likes_count: likes,
      dislikes_count: dislikes
    })
  }

  return directusApi.post('/news_stats', {
    news_id: newsId,
    likes_count: likes,
    dislikes_count: dislikes
  })
}

/* ================= REACTIONS ================= */

// Получить реакцию пользователя по новости и сессии
export const getUserReaction = async (newsId, sessionToken) => {
  try {
    const response = await directusApi.get('/news_reactions', {
      params: {
        filter: JSON.stringify({
          _and: [
            { news_id: { _eq: newsId } },
            { session_token: { _eq: sessionToken } }
          ]
        }),
        limit: 1
      }
    })
    return response.data
  } catch (error) {
    console.error('Error getting user reaction:', error)
    throw error
  }
}

// Добавить реакцию
export const addReaction = async (newsId, sessionToken, reactionType) => {
  try {
    const response = await directusApi.post('/news_reactions', {
      news_id: newsId,
      session_token: sessionToken,
      reaction_type: reactionType
    })
    return response.data
  } catch (error) {
    console.error('Error adding reaction:', error)
    throw error
  }
}

// Удалить реакцию
export const removeReaction = async (reactionId) => {
  try {
    const response = await directusApi.delete(`/news_reactions/${reactionId}`)
    return response.data
  } catch (error) {
    console.error('Error removing reaction:', error)
    throw error
  }
}

/* ================= NEWS STATS ================= */

export const getNewsStats = async (newsId) => {
  const { data } = await directusApi.get('/news_stats', {
    params: {
      filter: JSON.stringify({
        news_id: { _eq: newsId }
      }),
      fields: 'likes_count,dislikes_count'
    }
  })

  return data
}

/* ================= DIGESTS ================= */

export const getDigests = async (type = 'daily') => {
  const { data } = await directusApi.get('/digests', {
    params: {
      filter: JSON.stringify({
        digest_type: { _eq: type }
      }),
      sort: '-period_start',
      limit: 10,
      fields:
        'id,title,summary_ai,period_start,period_end,news_count,avg_score'
    }
  })

  return data
}