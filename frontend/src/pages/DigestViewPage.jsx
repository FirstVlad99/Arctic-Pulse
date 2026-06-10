import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Typography, Button, Spin, Empty } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import { getDigestById, getDigestNews } from '../api/directusApi'

const { Title, Text } = Typography

const DigestViewPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [digest, setDigest] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [id])

  const load = async () => {
    try {
      setLoading(true)

      const digestId = Number(id)

      const digestRes = await getDigestById(digestId)
      const digestData = digestRes?.data

      if (!digestData) {
        setDigest(null)
        return
      }

      const newsRes = await getDigestNews(digestId)
      const links = newsRes?.data || []

      const news = links
        .map(l => l.news_id)
        .filter(Boolean)
        .map(n => ({
          id: n.id,
          title: n.title,
          summary: n.summary_ai || n.content_clean
        }))

      setDigest({
        ...digestData,
        news
      })
    } catch (e) {
      console.error('DigestView error:', e)
      setDigest(null)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
      <Spin size="large" tip={t('digestView.loading')} />
    </div>
  )

  if (!digest) return <Empty description={t('digestView.notFound')} />

  return (
    <div style={{ padding: 24 }}>
      <Button
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/digests')}
        style={{ marginBottom: 16 }}
      >
        {t('digestView.back')}
      </Button>

      <Title level={2}>{digest.title}</Title>
      
      {digest.period_start && digest.period_end && (
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          {t('digestView.period')}: {new Date(digest.period_start).toLocaleDateString()} - {new Date(digest.period_end).toLocaleDateString()}
        </Text>
      )}
      
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        {digest.summary_ai}
      </Text>

      <Title level={4} style={{ marginBottom: 16 }}>
        {t('digestView.newsInDigest')} ({digest.news?.length || 0})
      </Title>

      <div style={{ marginTop: 20 }}>
        {(digest.news || []).map((n, index) => (
          <Card
            key={n.id}
            style={{ marginBottom: 16, cursor: 'pointer' }}
            onClick={() => navigate(`/news/${n.id}`)}
            hoverable
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Text strong style={{ fontSize: 18, color: '#1890ff' }}>
                {index + 1}
              </Text>
              <div style={{ flex: 1 }}>
                <Title level={5} style={{ marginBottom: 8 }}>{n.title}</Title>
                <Text type="secondary">
                  {n.summary?.length > 200 ? n.summary.slice(0, 200) + '...' : n.summary}
                </Text>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default DigestViewPage