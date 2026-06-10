// src/pages/CatalogPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  Row, Col, Card, Button, Tag, Space, Pagination, 
  DatePicker, Select, Typography, Empty, Drawer, 
  Spin, message, Badge, Tooltip
} from 'antd'
import { 
  FilterOutlined, 
  CalendarOutlined, 
  UserOutlined,
  ClearOutlined,
  ArrowRightOutlined,
  LikeOutlined,
  DislikeOutlined,
  RiseOutlined
} from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getNews, getSources, getTags, addReaction, removeReaction, getUserReaction, getNewsStats } from '../api/directusApi'
import { getAllVotes } from '../api/indexedDB'
import { useExcludedSources } from '../hooks/useExcludedSources'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const CatalogPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1100)
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 1100 && window.innerWidth < 1100)
  const [filterModalOpen, setFilterModalOpen] = useState(false)
  const [userVotes, setUserVotes] = useState({})
  const [dbInitialized, setDbInitialized] = useState(false)
  const [sourcesList, setSourcesList] = useState([])
  const [tagsList, setTagsList] = useState([])
  const { excludedSourceNames, loading: excludedLoading } = useExcludedSources()
  const [searchParams, setSearchParams] = useSearchParams()
  
  // Состояние фильтров
  const [filters, setFilters] = useState({
    categories: [],
    dateRange: null,
    sources: [],
    search: searchParams.get('search') || '',
    page: Number(searchParams.get('page')) || 1,
  })

  // Загрузка списка источников из Directus (только уникальные)
  useEffect(() => {
    const loadSources = async () => {
      try {
        const response = await getSources()
        const uniqueSourcesMap = new Map()
        response.data.forEach(s => {
          if (!uniqueSourcesMap.has(s.name)) {
            uniqueSourcesMap.set(s.name, {
              label: s.name,
              value: s.name,
            })
          }
        })
        const uniqueSources = Array.from(uniqueSourcesMap.values())
          .sort((a, b) => a.label.localeCompare(b.label))
        setSourcesList(uniqueSources)
      } catch (error) {
        console.error('Error loading sources:', error)
      }
    }
    loadSources()
  }, [])

  // Загрузка списка тегов из Directus (только уникальные)
  useEffect(() => {
    const loadTags = async () => {
      try {
        const response = await getTags()
        const uniqueTagsMap = new Map()
        response.data.forEach(t => {
          if (!uniqueTagsMap.has(t.name)) {
            uniqueTagsMap.set(t.name, {
              key: t.name,
              label: t.name,
              color: t.color || '#4A90E2',
            })
          }
        })
        const uniqueTags = Array.from(uniqueTagsMap.values())
          .sort((a, b) => a.label.localeCompare(b.label))
        setTagsList(uniqueTags)
      } catch (error) {
        console.error('Error loading tags:', error)
      }
    }
    loadTags()
  }, [])

  // Синхронизация с URL при изменении поиска извне
  useEffect(() => {
    const searchFromUrl = searchParams.get('search') || ''
    if (searchFromUrl !== filters.search) {
      setFilters(prev => ({ ...prev, search: searchFromUrl, page: 1 }))
    }
  }, [searchParams])

  // Обновление URL при изменении фильтров
  useEffect(() => {
    const params = new URLSearchParams()
    if (filters.search) params.set('search', filters.search)
    if (filters.page > 1) params.set('page', filters.page.toString())
    
    const newUrl = params.toString()
    const currentUrl = searchParams.toString()
    if (newUrl !== currentUrl) {
      setSearchParams(params, { replace: true })
    }
  }, [filters.search, filters.page, setSearchParams])

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1100)
      setIsTablet(window.innerWidth >= 1100 && window.innerWidth < 1100)
    }
    window.addEventListener('resize', handleResize)
    
    const loadUserVotes = async () => {
      try {
        const votes = await getAllVotes()
        const votesMap = {}
        votes.forEach(vote => {
          votesMap[vote.newsId] = vote.voteType
        })
        setUserVotes(votesMap)
        setDbInitialized(true)
      } catch (error) {
        console.error('Error loading user votes:', error)
        setDbInitialized(true)
      }
    }
    loadUserVotes()
    
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // helper session
  const getSession = () => {
    let token = localStorage.getItem('session_token')
    if (!token) {
      token = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`
      localStorage.setItem('session_token', token)
    }
    return token
  }

  // Получение новостей из Directus
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['catalog-news', filters, excludedSourceNames],
    queryFn: async () => {
      const params = {
        page: filters.page,
        limit: 20,
        sort: '-publication_date',
        filters: {
          categories: filters.categories,
          sources: filters.sources,
          search: filters.search,
          dateFrom: filters.dateRange?.[0]?.format('YYYY-MM-DD'),
          dateTo: filters.dateRange?.[1]?.format('YYYY-MM-DD'),
          excludedSources: excludedSourceNames,
        },
      }
      
      const response = await getNews(params)
      
      // Получаем статистику лайков/дизлайков для каждой новости
      const newsWithStats = await Promise.all(
        (response.data || []).map(async (item) => {
          try {
            const stats = await getNewsStats(item.id)
            const statsData = stats.data?.[0] || {}
            return {
              ...item,
              likes_count: statsData.likes_count || 0,
              dislikes_count: statsData.dislikes_count || 0,
            }
          } catch (error) {
            return {
              ...item,
              likes_count: 0,
              dislikes_count: 0,
            }
          }
        })
      )
      
      return {
        data: newsWithStats,
        meta: response.meta,
      }
    },
    enabled: !excludedLoading && sourcesList.length > 0 && dbInitialized,
  })

  // LIKE mutation
  const likeMutation = useMutation({
    mutationFn: async ({ newsId, remove, sessionToken }) => {
      if (remove) {
        const reaction = await getUserReaction(newsId, sessionToken)
        if (reaction.data?.[0]?.id) {
          return removeReaction(reaction.data[0].id)
        }
        return null
      } else {
        return addReaction(newsId, sessionToken, 'like')
      }
    },
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      console.error('Like mutation error:', error)
      message.error(t('common.errorOccurred'))
    }
  })

  // DISLIKE mutation
  const dislikeMutation = useMutation({
    mutationFn: async ({ newsId, remove, sessionToken }) => {
      if (remove) {
        const reaction = await getUserReaction(newsId, sessionToken)
        if (reaction.data?.[0]?.id) {
          return removeReaction(reaction.data[0].id)
        }
        return null
      } else {
        return addReaction(newsId, sessionToken, 'dislike')
      }
    },
    onSuccess: () => {
      refetch()
    },
    onError: (error) => {
      console.error('Dislike mutation error:', error)
      message.error(t('common.errorOccurred'))
    }
  })

  const handleLike = async (e, id) => {
    e.stopPropagation()

    const session = getSession()
    const current = userVotes[id]

    try {
      if (current === 'like') {
        await likeMutation.mutateAsync({ newsId: id, remove: true, sessionToken: session })
        setUserVotes(prev => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
      } else if (current === 'dislike') {
        await dislikeMutation.mutateAsync({ newsId: id, remove: true, sessionToken: session })
        await likeMutation.mutateAsync({ newsId: id, remove: false, sessionToken: session })
        setUserVotes(prev => ({ ...prev, [id]: 'like' }))
      } else {
        await likeMutation.mutateAsync({ newsId: id, remove: false, sessionToken: session })
        setUserVotes(prev => ({ ...prev, [id]: 'like' }))
      }
    } catch (error) {
      console.error('Error in handleLike:', error)
    }
  }

  const handleDislike = async (e, id) => {
    e.stopPropagation()

    const session = getSession()
    const current = userVotes[id]

    try {
      if (current === 'dislike') {
        await dislikeMutation.mutateAsync({ newsId: id, remove: true, sessionToken: session })
        setUserVotes(prev => {
          const copy = { ...prev }
          delete copy[id]
          return copy
        })
      } else if (current === 'like') {
        await likeMutation.mutateAsync({ newsId: id, remove: true, sessionToken: session })
        await dislikeMutation.mutateAsync({ newsId: id, remove: false, sessionToken: session })
        setUserVotes(prev => ({ ...prev, [id]: 'dislike' }))
      } else {
        await dislikeMutation.mutateAsync({ newsId: id, remove: false, sessionToken: session })
        setUserVotes(prev => ({ ...prev, [id]: 'dislike' }))
      }
    } catch (error) {
      console.error('Error in handleDislike:', error)
    }
  }

  const handleCategoryToggle = (categoryKey) => {
    setFilters(prev => ({
      ...prev,
      categories: prev.categories.includes(categoryKey)
        ? prev.categories.filter(c => c !== categoryKey)
        : [...prev.categories, categoryKey],
      page: 1
    }))
  }

  const resetFilters = () => {
    setFilters({
      categories: [],
      dateRange: null,
      sources: [],
      search: '',
      page: 1,
    })
    message.success(t('catalog.filtersReset'))
  }

  const FiltersContent = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('catalog.categories')}</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {tagsList.map(cat => (
            <Button
              key={cat.key}
              size={isMobile ? 'small' : 'middle'}
              type={filters.categories.includes(cat.key) ? 'primary' : 'default'}
              onClick={() => handleCategoryToggle(cat.key)}
              style={{
                backgroundColor: filters.categories.includes(cat.key) ? cat.color : undefined,
                borderColor: cat.color,
                color: filters.categories.includes(cat.key) ? 'white' : cat.color,
                fontSize: isMobile ? 12 : 14,
                padding: isMobile ? '4px 12px' : undefined
              }}
            >
              {cat.label}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('catalog.period')}</Text>
        <RangePicker 
          style={{ width: '100%' }}
          size={isMobile ? 'middle' : 'large'}
          value={filters.dateRange}
          onChange={(dates) => setFilters({ ...filters, dateRange: dates, page: 1 })}
          placeholder={[t('catalog.from'), t('catalog.to')]}
        />
      </div>

      <div>
        <Text strong style={{ display: 'block', marginBottom: 8 }}>{t('catalog.sources')}</Text>
        <Select
          mode="multiple"
          style={{ width: '100%' }}
          size={isMobile ? 'middle' : 'large'}
          placeholder={t('catalog.selectSources')}
          value={filters.sources}
          onChange={(values) => setFilters({ ...filters, sources: values, page: 1 })}
          options={sourcesList}
          allowClear
          maxTagCount={isMobile ? 'responsive' : 3}
          loading={sourcesList.length === 0}
          showSearch
          optionFilterProp="label"
        />
      </div>

      <Button 
        icon={<ClearOutlined />} 
        onClick={resetFilters}
        size={isMobile ? 'middle' : 'large'}
        danger
        block={isMobile}
      >
        {t('catalog.resetAllFilters')}
      </Button>
    </div>
  )

  const getCategoryColor = (categoryName) => {
    const cat = tagsList.find(c => c.key === categoryName)
    return cat?.color || '#4A90E2'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`
  }

  const getNewsRating = (likes, dislikes) => (likes || 0) - (dislikes || 0)

  if (!dbInitialized || excludedLoading || sourcesList.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  const getFilterColSpan = () => {
    if (isMobile) return 24
    if (isTablet) return 8
    return 6
  }

  const getContentColSpan = () => {
    if (isMobile) return 24
    if (isTablet) return 16
    return 18
  }

  return (
    <div style={{ padding: isMobile ? '0 8px' : '0 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <Title level={isMobile ? 3 : 2} style={{ color: '#0A2B4E', margin: 0, fontSize: isMobile ? 20 : 28 }}>
          {t('catalog.title')}
        </Title>
        {filters.search && (
          <Tag closable onClose={() => {
            setFilters(prev => ({ ...prev, search: '', page: 1 }))
          }} color="blue">
            {t('catalog.search')}: {filters.search}
          </Tag>
        )}
      </div>
      
      <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
        {!isMobile ? (
          <Col xs={24} md={getFilterColSpan()}>
            <Card 
              title={t('catalog.filters')} 
              style={{ borderRadius: 12, position: 'sticky', top: 90 }}
              size={isTablet ? 'small' : 'default'}
              extra={
                <Button type="text" size="small" onClick={resetFilters}>
                  {t('catalog.reset')}
                </Button>
              }
            >
              <FiltersContent />
            </Card>
          </Col>
        ) : (
          <>
            <Col xs={24}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Badge count={filters.categories.length + filters.sources.length + (filters.dateRange ? 1 : 0)}>
                  <Button 
                    icon={<FilterOutlined />} 
                    onClick={() => setFilterModalOpen(true)}
                    size="middle"
                  >
                    {t('catalog.filters')}
                  </Button>
                </Badge>
              </Space>
            </Col>
            
            <Drawer
              title={t('catalog.filters')}
              placement="bottom"
              onClose={() => setFilterModalOpen(false)}
              open={filterModalOpen}
              height="85%"
              closable
            >
              <FiltersContent />
            </Drawer>
          </>
        )}

        <Col xs={24} md={getContentColSpan()}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 8
          }}>
            <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
              {isFetching ? (
                <>
                  <Spin size="small" /> {t('catalog.search')}
                </>
              ) : (
                <>{t('catalog.found')}: <strong>{data?.meta?.total_count || data?.data?.length || 0}</strong> {t('catalog.news')}</>
              )}
            </Text>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" tip={t('catalog.loadingNews')} />
            </div>
          ) : data?.data?.length === 0 ? (
            <Empty 
              description={t('catalog.noNewsFound')}
              style={{ marginTop: 50 }}
            >
              <Button onClick={resetFilters}>{t('catalog.resetFilters')}</Button>
            </Empty>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
                {data?.data?.map(item => {
                  const likes = item.likes_count || 0
                  const dislikes = item.dislikes_count || 0
                  const rating = getNewsRating(likes, dislikes)
                  const ratingColor = rating >= 0 ? '#52c41a' : '#ff4d4f'
                  const userVote = userVotes[item.id]
                  const tags = item.tags || []
                  
                  return (
                    <Card 
                      key={item.id} 
                      hoverable
                      style={{ borderRadius: 12, cursor: 'pointer' }}
                      styles={{ body: { padding: isMobile ? 12 : 20 } }}
                      onClick={() => navigate(`/news/${item.id}`)}
                    >
                      <Row gutter={[isMobile ? 8 : 16, isMobile ? 8 : 16]}>
                        <Col xs={24}>
                          <Space wrap style={{ marginBottom: 8 }} size={[8, 4]}>
                            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                              <CalendarOutlined /> {formatDate(item.publication_date)}
                            </Text>
                            <Text type="secondary" style={{ fontSize: isMobile ? 10 : 12 }}>
                              <UserOutlined /> {item.source_id?.name || t('catalog.unknown')}
                            </Text>
                          </Space>

                          {tags.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                              {tags.slice(0, isMobile ? 3 : undefined).map(tag => (
                                <Tag 
                                  key={tag.tags_id?.id} 
                                  color={getCategoryColor(tag.tags_id?.name)}
                                  style={{ fontSize: isMobile ? 10 : 12, marginInlineEnd: 0 }}
                                >
                                  {tag.tags_id?.name}
                                </Tag>
                              ))}
                              {isMobile && tags.length > 3 && (
                                <Tag style={{ fontSize: 10 }}>+{tags.length - 3}</Tag>
                              )}
                            </div>
                          )}

                          <Title level={isMobile ? 5 : 4} style={{ margin: '0 0 6px', fontSize: isMobile ? 14 : 18 }}>
                            {item.title.length > (isMobile ? 80 : 120) 
                              ? item.title.slice(0, isMobile ? 80 : 120) + '...' 
                              : item.title}
                          </Title>
                          
                          <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14, display: 'block' }}>
                            {item.content_clean?.substring(0, isMobile ? 80 : 150)}
                            {item.content_clean?.length > (isMobile ? 80 : 150) && '...'}
                          </Text>
                          
                          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16, marginTop: 10, flexWrap: 'wrap' }}>
                            <Tooltip title={userVote === 'like' ? t('catalog.removeLike') : t('catalog.usefulNews')}>
                              <Button 
                                type={userVote === 'like' ? 'primary' : 'text'}
                                size={isMobile ? 'small' : 'middle'}
                                icon={<LikeOutlined />}
                                onClick={(e) => handleLike(e, item.id)}
                                style={{ 
                                  color: userVote === 'like' ? '#fff' : '#52c41a',
                                  backgroundColor: userVote === 'like' ? '#52c41a' : 'transparent',
                                  borderColor: userVote === 'like' ? '#52c41a' : undefined,
                                }}
                              >
                                {likes > 0 && likes}
                              </Button>
                            </Tooltip>
                            
                            <Tooltip title={userVote === 'dislike' ? t('catalog.removeDislike') : t('catalog.notUsefulNews')}>
                              <Button 
                                type={userVote === 'dislike' ? 'primary' : 'text'}
                                size={isMobile ? 'small' : 'middle'}
                                icon={<DislikeOutlined />}
                                onClick={(e) => handleDislike(e, item.id)}
                                style={{ 
                                  color: userVote === 'dislike' ? '#fff' : '#ff4d4f',
                                  backgroundColor: userVote === 'dislike' ? '#ff4d4f' : 'transparent',
                                  borderColor: userVote === 'dislike' ? '#ff4d4f' : undefined,
                                }}
                              >
                                {dislikes > 0 && dislikes}
                              </Button>
                            </Tooltip>

                            <Tooltip title={`${t('catalog.rating')}: ${rating > 0 ? '+' : ''}${rating}`}>
                              <Text style={{ color: ratingColor, fontWeight: 'bold' }}>
                                <RiseOutlined /> {rating > 0 ? `+${rating}` : rating}
                              </Text>
                            </Tooltip>
                          </div>

                          <div style={{ marginTop: 10 }}>
                            <Button
                              type="link"
                              size={isMobile ? 'small' : 'middle'}
                              style={{ paddingLeft: 0, color: '#4A90E2' }}
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/news/${item.id}`)
                              }}
                            >
                              {t('catalog.readMore')} <ArrowRightOutlined />
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </Card>
                  )
                })}
              </div>

              {data?.meta?.total_count > 20 && (
                <Pagination
                  current={filters.page}
                  total={data.meta.total_count}
                  pageSize={20}
                  onChange={(page) => setFilters({ ...filters, page })}
                  style={{ marginTop: 32, textAlign: 'center' }}
                  size={isMobile ? 'small' : 'default'}
                  showSizeChanger={!isMobile}
                  showTotal={(total) => !isMobile ? `${t('catalog.total')} ${total} ${t('catalog.news')}` : undefined}
                  simple={isMobile}
                />
              )}
            </>
          )}
        </Col>
      </Row>
    </div>
  )
}

export default CatalogPage