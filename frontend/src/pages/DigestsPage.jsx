import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Row,
  Col,
  Card,
  Typography,
  Button,
  Space,
  Tag,
  Empty,
  Spin,
  DatePicker,
  Tabs
} from 'antd'
import { CalendarOutlined, FileTextOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

import {
  fetchDigests,
  fetchDigestNews,
  fetchNewsBatch
} from '../api/directusApi'

const { Title, Text } = Typography
const { RangePicker } = DatePicker

const DigestsPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [digests, setDigests] = useState([])
  const [activeTab, setActiveTab] = useState('daily')
  const [dateRange, setDateRange] = useState([null, null])

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    try {
      setLoading(true)

      const digestsRes = await fetchDigests()
      const digestsData = digestsRes?.data?.data ?? []

      const linksRes = await fetchDigestNews({
        fields: ['id', 'digest_id', 'news_id', 'position', 'score_snapshot']
      })

      const links = linksRes?.data?.data ?? []

      const newsIds = [...new Set(links.map(l => l.news_id))]
      const newsRes = await fetchNewsBatch(newsIds)
      const newsMap = Object.fromEntries(
        (newsRes?.data?.data ?? []).map(n => [n.id, n])
      )

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
        (a, b) =>
          dayjs(b.period_end).valueOf() -
          dayjs(a.period_end).valueOf()
      )

      setDigests(sorted)
    } catch (e) {
      console.error('Digests load error:', e)
    } finally {
      setLoading(false)
    }
  }

  const filtered = digests.filter(d => {
    if (d.digest_type !== activeTab) return false

    if (!dateRange[0] || !dateRange[1]) return true

    return (
      dayjs(d.period_start).isSameOrBefore(dateRange[1]) &&
      dayjs(d.period_end).isSameOrAfter(dateRange[0])
    )
  })

  const openDigest = (d) => {
    navigate(`/digests/${d.digest_type}/${d.id}`)
  }

  const tabItems = [
    { key: 'daily', label: t('digests.daily') },
    { key: 'weekly', label: t('digests.weekly') }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>{t('digests.title')}</Title>

      {/* ТАБЫ */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        style={{ marginBottom: 16 }}
      />

      {/* ФИЛЬТР ДАТ */}
      <RangePicker
        value={dateRange}
        onChange={(v) => setDateRange(v || [null, null])}
        style={{ marginBottom: 16 }}
        placeholder={[t('digests.startDate'), t('digests.endDate')]}
      />

      {/* ПУСТО */}
      {filtered.length === 0 ? (
        <Empty description={t('digests.noDigests')} />
      ) : (
        <Row gutter={[16, 16]}>
          {filtered.map(d => (
            <Col xs={24} md={8} key={d.id}>
              <Card
                hoverable
                onClick={() => openDigest(d)}
                style={{ cursor: 'pointer' }}
              >
                <div style={{ marginBottom: 8 }}>
                  <Text strong>
                    <CalendarOutlined /> {d.title || d.period}
                  </Text>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <Text type="secondary">
                    {t('digests.periodLabel')}: {dayjs(d.period_start).format('DD.MM.YYYY')} - {dayjs(d.period_end).format('DD.MM.YYYY')}
                  </Text>
                </div>

                <Text type="secondary">
                  {d.summary_ai}
                </Text>

                <div style={{ marginTop: 12 }}>
                  {(d.topNews || []).slice(0, 3).map((n, idx) => (
                    <div
                      key={n.id}
                      style={{
                        padding: 10,
                        borderRadius: 8,
                        background: '#f6f6f6',
                        marginBottom: 8
                      }}
                    >
                      <Text strong style={{ display: 'block' }}>
                        {idx + 1}. {n.title}
                      </Text>

                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {n.summary?.length > 100 ? n.summary.slice(0, 100) + '...' : n.summary}
                      </Text>
                    </div>
                  ))}
                </div>

                <Button
                  type="link"
                  icon={<FileTextOutlined />}
                  style={{ marginTop: 8, paddingLeft: 0 }}
                >
                  {t('digests.open')}
                </Button>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

export default DigestsPage