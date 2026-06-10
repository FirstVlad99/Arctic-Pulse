import { useState, useEffect } from 'react'
import {
  Card, Row, Col, Typography, Progress,
  Spin, Button, message, Space, Statistic
} from 'antd'
import {
  ReloadOutlined,
  SafetyOutlined,
  StarOutlined,
  CalendarOutlined,
  TeamOutlined,
  TagOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  Legend, ResponsiveContainer
} from 'recharts'
import { directusApi } from '../api/directusApi'

const { Title, Text } = Typography

const AURORA_COLORS = [
  '#1a6abf', '#1970b7', '#1876af', '#16829f', '#158897',
  '#148e8f', '#129487', '#119a7e', '#10a076', '#0fa570',
  '#0faa68', '#0faa68'
]

const AnalyticsPage = () => {
  const { t } = useTranslation()
  const [loading, setLoading] = useState(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1100 : false
  )

  const [sourcesNewsCount, setSourcesNewsCount] = useState([])
  const [sourcesStats, setSourcesStats] = useState([])
  const [themesDistribution, setThemesDistribution] = useState([])
  const [totalNews, setTotalNews] = useState(0)
  const [avgReliability, setAvgReliability] = useState(0)
  const [avgRelevance, setAvgRelevance] = useState(0)
  const getPieRadius = () => (isMobileOrTablet ? 90 : 130)

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1100)
    }

    handleResize()

    window.addEventListener('resize', handleResize)
    loadAnalytics()

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const loadAnalytics = async () => {
    setLoading(true)

    try {
      // ---------------- NEWS ----------------
      const newsResponse = await directusApi.get('/news', {
        params: {
          fields: [
            'id',
            'title',
            'publication_date',
            'relevance_score',
            'source_id.id',
            'source_id.name'
          ],
          filter: JSON.stringify({ is_arctic: { _eq: true } }),
          limit: 5000,
          sort: '-publication_date'
        }
      })

      const news = newsResponse.data.data || []
      setTotalNews(news.length)

      if (!news.length) {
        message.warning(t('analytics.noNews'))
        setSourcesNewsCount([])
        setSourcesStats([])
        setThemesDistribution([])
        setAvgReliability(0)
        setAvgRelevance(0)
        setLoading(false)
        return
      }

      // ---------------- SOURCES MAP ----------------
      const sourceStatsMap = new Map()

      news.forEach(item => {
        const sourceId = item.source_id?.id
        const sourceName = item.source_id?.name
        const relevance = Number(item.relevance_score) || 0

        if (!sourceId) return

        if (!sourceStatsMap.has(sourceId)) {
          sourceStatsMap.set(sourceId, {
            id: sourceId,
            name: sourceName,
            count: 0,
            totalRelevance: 0
          })
        }

        const s = sourceStatsMap.get(sourceId)
        s.count += 1
        s.totalRelevance += relevance
      })

      // ---------------- SOURCES RATING ----------------
      const sourcesResponse = await directusApi.get('/sources', {
        params: {
          fields: ['id', 'name', 'rating'],
          limit: 100
        }
      })

      const ratingMap = new Map()
      sourcesResponse.data.data.forEach(s => {
        ratingMap.set(s.id, Number(s.rating) || 0)
      })

      // ---------------- TOP SOURCES ----------------
      const topSources = Array.from(sourceStatsMap.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)

      const sourcesNewsData = topSources.map((item, index) => ({
        id: item.id,
        name: item.name,
        count: item.count,
        color: AURORA_COLORS[index % AURORA_COLORS.length]
      }))

      setSourcesNewsCount(sourcesNewsData)

      // ---------------- STATS ----------------
      const sourcesStatsData = topSources.map((item, index) => {
        const reliability = ratingMap.get(item.id) || 70
        const relevance =
          item.count > 0
            ? Math.round(item.totalRelevance / item.count)
            : 0

        return {
          id: item.id,
          name: item.name,
          reliability: Math.round(reliability),
          relevance,
          color: AURORA_COLORS[index % AURORA_COLORS.length]
        }
      })

      setSourcesStats(sourcesStatsData)

      // ---------------- WEIGHTED AVG ----------------
      let totalRel = 0
      let totalRec = 0
      let totalCount = 0

      sourcesStatsData.forEach(s => {
        const source = sourceStatsMap.get(s.id)
        const count = source?.count || 0

        totalRel += s.reliability * count
        totalRec += s.relevance * count
        totalCount += count
      })

      if (totalCount > 0) {
        setAvgReliability(Math.round(totalRel / totalCount))
        setAvgRelevance(Math.round(totalRec / totalCount))
      } else {
        setAvgReliability(0)
        setAvgRelevance(0)
      }

      // ---------------- TAGS ----------------
      const [newsTagsResponse, tagsResponse] = await Promise.all([
        directusApi.get('/news_tags', {
          params: {
            fields: ['tag_id.id'],
            limit: 5000
          }
        }),
        directusApi.get('/tags', {
          params: {
            fields: ['id', 'name'],
            limit: 500
          }
        })
      ])

      const tagMap = new Map(
        tagsResponse.data.data.map(t => [t.id, t.name])
      )

      const themesMap = new Map()

      newsTagsResponse.data.data.forEach(item => {
        const tagId = item.tag_id?.id || item.tag_id
        const tagName = tagMap.get(tagId)

        if (tagName) {
          themesMap.set(tagName, (themesMap.get(tagName) || 0) + 1)
        }
      })

      const themesData = Array.from(themesMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([name, value], index) => ({
          name: name.length > 20 ? name.slice(0, 20) + '...' : name,
          value,
          color: AURORA_COLORS[index % AURORA_COLORS.length]
        }))

      setThemesDistribution(themesData)

    } catch (error) {
      console.error(error)
      message.error(t('analytics.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const handleUpdate = () => loadAnalytics()

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: 'calc(100vh - 200px)'
      }}>
        <Card style={{ borderRadius: 20, textAlign: 'center', padding: '40px' }}>
          <Spin size="large" tip={t('analytics.loading')} />
        </Card>
      </div>
    )
  }

  const getChartHeight = () => (isMobileOrTablet ? 300 : 400)
  const getPieOuterRadius = () => (isMobileOrTablet ? 100 : 140)

  return (
    <div style={{ 
      padding: isMobileOrTablet ? '16px' : '24px',
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <div>
          <Title level={isMobileOrTablet ? 3 : 2} style={{ margin: 0 }}>
            {t('analytics.title')}
          </Title>
          <Text type="secondary">{t('analytics.subtitle')}</Text>
        </div>

        <Button 
          icon={<ReloadOutlined />} 
          onClick={handleUpdate} 
          type="primary"
          size={isMobileOrTablet ? 'middle' : 'large'}
          style={{ borderRadius: 8 }}
        >
          {t('analytics.update')}
        </Button>
      </div>

      {/* Stats Cards - выровненные по горизонтали */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={t('analytics.totalNews')}
              value={totalNews}
              prefix={<CalendarOutlined style={{ fontSize: 20 }} />}
              valueStyle={{ fontSize: 28 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={t('analytics.avgReliability')}
              value={avgReliability}
              suffix="%"
              prefix={<SafetyOutlined style={{ fontSize: 20 }} />}
              valueStyle={{ fontSize: 28 }}
            />
            <Progress 
              percent={avgReliability} 
              showInfo={false}
              strokeColor={AURORA_COLORS[3]}
              style={{ marginTop: 12 }}
            />
          </Card>
        </Col>
        
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Statistic
              title={t('analytics.avgRelevance')}
              value={avgRelevance}
              suffix="%"
              prefix={<StarOutlined style={{ fontSize: 20 }} />}
              valueStyle={{ fontSize: 28 }}
            />
            <Progress 
              percent={avgRelevance} 
              showInfo={false}
              strokeColor={AURORA_COLORS[6]}
              style={{ marginTop: 12 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>{t('analytics.newsBySource')}</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: '20px' }}
          >
            {sourcesNewsCount.length > 0 ? (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <BarChart 
                  data={sourcesNewsCount}
                  margin={{ top: 10, right: 10, left: isMobileOrTablet ? 10 : 50, bottom: isMobileOrTablet ? 50 : 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="name" 
                    angle={isMobileOrTablet ? -45 : 0}
                    textAnchor={isMobileOrTablet ? "end" : "middle"}
                    height={isMobileOrTablet ? 80 : 40}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis />
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                    formatter={(value) => [`${value} ${t('analytics.news')}`, t('analytics.newsCount')]}
                  />
                  <Bar 
                    dataKey="count" 
                    fill={AURORA_COLORS[0]} 
                    name={t('analytics.newsCount')}
                    radius={[8, 8, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>
                {t('analytics.noData')}
              </div>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <TagOutlined />
                <span>{t('analytics.themesDistribution')}</span>
              </Space>
            }
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: '20px' }}
          >
            {themesDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={getChartHeight()}>
                <PieChart>
                  <Pie
                    data={themesDistribution}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    outerRadius={getPieOuterRadius()}
                    innerRadius={isMobileOrTablet ? 40 : 60}
                    labelLine={!isMobileOrTablet}
                    label={!isMobileOrTablet ? ({ name, percent }) => 
                      `${name} (${(percent * 100).toFixed(0)}%)` : false
                    }
                  >
                    {themesDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>

                  <RechartsTooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                    formatter={(value) => [`${value} ${t('analytics.news')}`, t('analytics.newsCount')]}
                  />
                  {isMobileOrTablet && <Legend />}
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', padding: 50, color: '#999' }}>
                {t('analytics.noThemesData')}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default AnalyticsPage