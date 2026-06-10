import { useState, useEffect } from 'react'
import {
  Table, Tag, message, Card,
  Typography, Button, Spin
} from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import { fetchSources } from '../api/directusApi'

import {
  getAllSourceStatuses,
  syncSourceStatuses
} from '../api/indexedDB'

const { Title, Text } = Typography

const getIsMobile = () => {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 1100
}

const SourcesPage = () => {
  const { t } = useTranslation()

  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [isMobile, setIsMobile] = useState(getIsMobile())

  useEffect(() => {
    const onResize = () => setIsMobile(getIsMobile())
    window.addEventListener('resize', onResize)

    loadSources()

    return () => window.removeEventListener('resize', onResize)
  }, [])

  const loadSources = async () => {
    try {
      setLoading(true)

      const res = await fetchSources()
      
      // Безопасное получение массива данных
      let data = []
      
      if (Array.isArray(res)) {
        data = res
      } else if (res?.data?.data && Array.isArray(res.data.data)) {
        data = res.data.data
      } else if (res?.data && Array.isArray(res.data)) {
        data = res.data
      } else if (res?.items && Array.isArray(res.items)) {
        data = res.items
      } else {
        console.warn('Unexpected API response structure:', res)
        data = []
      }

      // Проверка, что data - массив перед map
      if (!Array.isArray(data)) {
        console.error('Data is not an array:', data)
        message.error(t('sources.invalidData'))
        setSources([])
        return
      }

      const formatted = data.map(item => ({
        id: item.id,
        name: item.name,
        url: item.website_url,
        is_active: item.is_active,
        rating: Number(item.rating ?? 0)
      }))

      setSources(formatted)

      await syncSourceStatuses(formatted)

    } catch (e) {
      console.error('Error loading sources:', e)
      message.error(t('sources.loadError'))
      setSources([])
    } finally {
      setLoading(false)
    }
  }

  const columns = [
    {
      title: t('sources.source'),
      dataIndex: 'name',
      render: (name, record) => (
        <div>
          <Text strong>{name}</Text>
          <div style={{ fontSize: 12, color: '#888' }}>
            {record.url}
          </div>
        </div>
      )
    },

    {
      title: t('sources.reliability'),
      dataIndex: 'rating',
      render: v => (
        <Tag color={v > 80 ? 'green' : v > 50 ? 'blue' : 'orange'}>
          {v}%
        </Tag>
      )
    },

    {
      title: t('sources.systemStatus'),
      dataIndex: 'is_active',
      render: v => (
        <Tag color={v ? 'green' : 'red'}>
          {v ? t('sources.active') : t('sources.inactive')}
        </Tag>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        height: 300,
        alignItems: 'center'
      }}>
        <Spin size="large" tip={t('sources.loading')} />
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 16
      }}>
        <Title level={2} style={{ margin: 0 }}>
          {t('sources.title')}
        </Title>

        <Button
          icon={<ReloadOutlined />}
          onClick={loadSources}
        >
          {t('sources.update')}
        </Button>
      </div>

      {/* Table */}
      <Card
        style={{
          borderRadius: 12
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={sources}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={isMobile ? { x: 'max-content' } : undefined}
        />
      </Card>

    </div>
  )
}

export default SourcesPage