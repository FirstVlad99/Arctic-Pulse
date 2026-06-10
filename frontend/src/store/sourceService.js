import { directusApi } from '../api/directusApi'

// 🔥 получить источники
export const getSources = async () => {
  const res = await directusApi.get('/sources', {
    params: {
      limit: 100,
      fields:
        'id,name,website_url,rating,likes_count,dislikes_count,is_active'
    }
  })

  return res?.data?.data ?? res?.data ?? []
}

// 🔥 обновить активность источника
export const updateSourceActive = async (id, isActive) => {
  const res = await directusApi.patch(`/sources/${id}`, {
    is_active: isActive
  })

  return res.data
}