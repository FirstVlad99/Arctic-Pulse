import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Row,
  Col,
  Card,
  Space,
  Skeleton,
  Typography,
  Spin,
  Empty,
  Tag,
  Button
} from 'antd'

import { 
  CalendarOutlined, 
  LikeOutlined, 
  DislikeOutlined, 
  UserOutlined,
  FileTextOutlined,
  ArrowRightOutlined,
  FireOutlined
} from '@ant-design/icons'

import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

import { getNews, getNewsStats, fetchDigests, fetchDigestNews, fetchNewsBatch } from '../api/directusApi'
import { useExcludedSources } from '../hooks/useExcludedSources'

const { Title, Text, Paragraph } = Typography

// Пастельные цвета
const PASTEL_BLUE = '#E8F4F8'
const PASTEL_TEAL = '#D4F1F4'
const DARK_BLUE = '#2C7DA0'
const ACCENT_TEAL = '#61A5C2'

const HomePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const [dbInitialized, setDbInitialized] = useState(false)

  const { excludedSourceNames, loading: excludedLoading } = useExcludedSources()

  // Определяем размеры экрана
  const isMobile = windowWidth < 1100
  const isTablet = windowWidth >= 1100 && windowWidth < 1100
  const isDesktop = windowWidth >= 1100

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)

    setDbInitialized(true)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // =====================
  // GET LATEST DIGEST
  // =====================
  const { data: latestDigest, isLoading: digestLoading } = useQuery({
    queryKey: ['latest-digest'],
    enabled: !excludedLoading,
    queryFn: async () => {
      try {
        const digestsRes = await fetchDigests()
        const digestsData = digestsRes?.data?.data ?? []

        if (digestsData.length === 0) return null

        const linksRes = await fetchDigestNews({
          fields: ['id', 'digest_id', 'news_id', 'position', 'score_snapshot']
        })
        const links = linksRes?.data?.data ?? []

        const newsIds = [...new Set(links.map(l => l.news_id))]
        
        let newsMap = {}
        if (newsIds.length > 0) {
          const newsRes = await fetchNewsBatch(newsIds)
          newsMap = Object.fromEntries(
            (newsRes?.data?.data ?? []).map(n => [n.id, n])
          )
        }

        const map = {}
        for (const d of digestsData) {
          map[d.id] = {
            ...d,
            topNews: []
          }
        }

        for (const link of links) {
          const digest = map[link.digest_id]
          const news = newsMap[link.news_id]
          if (!digest || !news) continue

          digest.topNews.push({
            id: news.id,
            title: news.title,
            summary: news.summary_ai || news.content_clean?.slice(0, 140),
            position: link.position ?? 999,
            score: link.score_snapshot ?? news.relevance_score
          })
        }

        Object.values(map).forEach(d => {
          d.topNews.sort((a, b) => a.position - b.position)
        })

        const sorted = Object.values(map).sort(
          (a, b) => dayjs(b.period_end).valueOf() - dayjs(a.period_end).valueOf()
        )

        return sorted[0] || null
      } catch (error) {
        console.error('Error loading digest:', error)
        return null
      }
    }
  })

  // =====================
  // LATEST NEWS QUERY
  // =====================
  const { data: news, isLoading: newsLoading } = useQuery({
    queryKey: ['home-news', excludedSourceNames],
    enabled: !excludedLoading,
    queryFn: async () => {
      const params = {
        limit: isMobile ? 5 : isTablet ? 8 : 10,
        sort: '-publication_date',
        filters: {
          dateFrom: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          excludedSources: excludedSourceNames,
        },
      }
      
      const response = await getNews(params)
      
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
      
      return newsWithStats
    }
  })

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return `${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })}`
  }

  const formatFullDate = (dateStr) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const goToNews = id => navigate(`/news/${id}`)
  const goToDigest = (digestType, id) => navigate(`/digests/${digestType}/${id}`)

  const isLoading = digestLoading || newsLoading

  // =====================
  // КОМПОНЕНТ ДАЙДЖЕСТА
  // =====================
  const DigestCard = () => {
    if (!latestDigest) return null
    
    const digestTitle = latestDigest.digest_type === 'daily' 
      ? t('home.digestDaily') 
      : t('home.digestWeekly')
    
    return (
      <Card 
        style={{ 
          borderRadius: 16,
          background: `linear-gradient(135deg, ${PASTEL_BLUE} 0%, ${PASTEL_TEAL} 100%)`,
          border: `1px solid ${ACCENT_TEAL}`,
          height: '100%'
        }}
        bodyStyle={{ padding: isMobile ? 16 : 24 }}
      >
        <Space direction="vertical" size={isMobile ? 12 : 16} style={{ width: '100%' }}>
          <Space wrap size={[8, 4]}>
            <FireOutlined style={{ fontSize: isMobile ? 20 : 24, color: DARK_BLUE }} />
            <Title level={isMobile ? 5 : 4} style={{ color: DARK_BLUE, margin: 0 }}>
              {digestTitle}
            </Title>
            <Tag style={{ backgroundColor: ACCENT_TEAL, border: 'none', color: 'white' }}>
              {formatFullDate(latestDigest.period_start)} — {formatFullDate(latestDigest.period_end)}
            </Tag>
          </Space>

          <Title level={isMobile ? 5 : 4} style={{ color: DARK_BLUE, margin: 0, fontSize: isMobile ? 16 : 18 }}>
            {latestDigest.title}
          </Title>

          <Paragraph style={{ color: '#4A6A7A', fontSize: isMobile ? 13 : 14 }} ellipsis={{ rows: 3 }}>
            {latestDigest.summary_ai}
          </Paragraph>

          {/* Топ новостей дайджеста */}
          {latestDigest.topNews && latestDigest.topNews.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ color: DARK_BLUE, fontSize: isMobile ? 13 : 14 }}>
                {t('home.inDigest')}:
              </Text>
              <div style={{ marginTop: 8 }}>
                {latestDigest.topNews.slice(0, isMobile ? 2 : 3).map((item, idx) => (
                  <div 
                    key={item.id}
                    style={{ 
                      padding: isMobile ? '6px 0' : '8px 0',
                      borderBottom: idx < (isMobile ? 2 : 3) - 1 ? `1px solid ${ACCENT_TEAL}` : 'none'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                      <Text style={{ color: DARK_BLUE, fontWeight: 'bold', fontSize: isMobile ? 12 : 14 }}>
                        {idx + 1}.
                      </Text>
                      <div style={{ flex: 1 }}>
                        <Text 
                          style={{ 
                            color: DARK_BLUE, 
                            cursor: 'pointer', 
                            display: 'block',
                            fontSize: isMobile ? 13 : 14
                          }}
                          onClick={() => goToNews(item.id)}
                        >
                          {item.title.length > (isMobile ? 50 : 60) 
                            ? item.title.slice(0, isMobile ? 50 : 60) + '...' 
                            : item.title}
                        </Text>
                        <Text style={{ color: ACCENT_TEAL, fontSize: isMobile ? 10 : 11 }}>
                          {t('home.score')}: {Math.round(item.score)}%
                        </Text>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            type="default" 
            icon={<ArrowRightOutlined />}
            onClick={() => goToDigest(latestDigest.digest_type, latestDigest.id)}
            style={{ 
              alignSelf: 'flex-start',
              backgroundColor: ACCENT_TEAL,
              borderColor: ACCENT_TEAL,
              color: 'white'
            }}
            size={isMobile ? 'middle' : 'default'}
          >
            {t('home.readFull')}
          </Button>
        </Space>
      </Card>
    )
  }

  // =====================
  // КОМПОНЕНТ НОВОСТЕЙ
  // =====================
  const NewsList = () => {
    if (newsLoading) {
      return (
        <div>
          {[1, 2, 3, 4].map(i => (
            <Card key={i} style={{ marginBottom: 16, borderRadius: 12 }}>
              <Skeleton active avatar={{ size: 'small' }} paragraph={{ rows: 3 }} />
            </Card>
          ))}
        </div>
      )
    }
    
    if (!news?.length) {
      return <Empty description={t('home.noNewsLast7Days')} />
    }
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 12 : 16 }}>
        {news.map(item => {
          const likes = item.likes_count || 0
          const dislikes = item.dislikes_count || 0
          const tags = item.tags || []
          const rating = likes - dislikes
          const ratingColor = rating >= 0 ? '#52c41a' : '#ff4d4f'
          
          return (
            <Card 
              key={item.id}
              hoverable 
              onClick={() => goToNews(item.id)}
              style={{ borderRadius: 12, cursor: 'pointer' }}
              bodyStyle={{ padding: isMobile ? 12 : 20 }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={isMobile ? 6 : 8}>
                <Space wrap size={[8, 4]}>
                  <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                    <CalendarOutlined /> {formatDate(item.publication_date)}
                  </Text>
                  <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12 }}>
                    <UserOutlined /> {item.source_id?.name || t('home.unknown')}
                  </Text>
                </Space>

                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {tags.slice(0, isMobile ? 2 : 3).map(tag => (
                      <Tag 
                        key={tag.tags_id?.id} 
                        color={tag.tags_id?.color || '#4A90E2'}
                        style={{ fontSize: isMobile ? 10 : 11, marginInlineEnd: 0 }}
                      >
                        {tag.tags_id?.name}
                      </Tag>
                    ))}
                    {isMobile && tags.length > 2 && (
                      <Tag style={{ fontSize: 10 }}>+{tags.length - 2}</Tag>
                    )}
                  </div>
                )}

                <Text strong style={{ fontSize: isMobile ? 14 : 16 }}>
                  {item.title}
                </Text>

                <Text type="secondary" style={{ fontSize: isMobile ? 12 : 14 }}>
                  {item.content_clean?.substring(0, isMobile ? 100 : 150)}
                  {item.content_clean?.length > (isMobile ? 100 : 150) && '...'}
                </Text>

                <Space size={isMobile ? 8 : 16}>
                  <Text style={{ color: '#52c41a', fontSize: isMobile ? 12 : 14 }}>
                    <LikeOutlined /> {likes}
                  </Text>
                  <Text style={{ color: '#ff4d4f', fontSize: isMobile ? 12 : 14 }}>
                    <DislikeOutlined /> {dislikes}
                  </Text>
                  <Text style={{ color: ratingColor, fontSize: isMobile ? 12 : 14 }}>
                    Рейтинг: {rating > 0 ? `+${rating}` : rating}
                  </Text>
                </Space>
              </Space>
            </Card>
          )
        })}
      </div>
    )
  }

  // =====================
  // UI
  // =====================
  if (!dbInitialized || excludedLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  // Мобильная версия (до 1100px)
  if (isMobile) {
    return (
      <div style={{ padding: '16px' }}>
        <Title level={3} style={{ marginBottom: 20, fontSize: 22 }}>
          {t('home.title')}
        </Title>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Дайджест сверху на мобильных */}
          {latestDigest && <DigestCard />}
          
          {/* Новости */}
          <div>
            <Title level={5} style={{ marginBottom: 12, fontSize: 16 }}>
              {t('home.latestNews')}
            </Title>
            <NewsList />
          </div>
        </div>
      </div>
    )
  }

  // Планшетная версия (1100px - 1100px)
  if (isTablet) {
    return (
      <div style={{ padding: '20px' }}>
        <Title level={3} style={{ marginBottom: 24 }}>
          {t('home.title')}
        </Title>

        <Row gutter={20}>
          <Col xs={24} md={14}>
            <Title level={5} style={{ marginBottom: 16 }}>
              {t('home.latestNews')}
            </Title>
            <NewsList />
          </Col>
          <Col xs={24} md={10}>
            <div style={{ marginTop: 0 }}>
              {latestDigest && <DigestCard />}
            </div>
          </Col>
        </Row>
      </div>
    )
  }

  // Десктопная версия (1100px+)
  return (
    <div style={{ padding: '0 24px', maxWidth: 1400, margin: '0 auto' }}>
      <Title level={2} style={{ marginBottom: 32 }}>
        {t('home.title')}
      </Title>

      <Row gutter={32}>
        <Col xs={24} md={16} lg={16}>
          <Title level={4} style={{ marginBottom: 20 }}>
            {t('home.latestNews')}
          </Title>
          <NewsList />
        </Col>
        <Col xs={24} md={8} lg={8}>
          <div style={{ marginTop: 40 }}>
            {latestDigest && <DigestCard />}
          </div>
        </Col>
      </Row>
    </div>
  )
}

export default HomePage