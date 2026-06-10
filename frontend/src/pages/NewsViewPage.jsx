import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Button, Space, Divider, message, Typography, Spin, Card, Tag, Tooltip } from 'antd'
import { useTranslation } from 'react-i18next'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CalendarOutlined,
  LikeOutlined,
  DislikeOutlined,
  ShareAltOutlined,
  ArrowLeftOutlined,
  FieldTimeOutlined
} from '@ant-design/icons'

import { directusApi, addReaction, removeReaction, getUserReaction } from '../api/directusApi'
import { registerVote, removeVote, getAllVotes } from '../api/indexedDB'

const { Title, Text, Paragraph } = Typography

const NewsViewPage = () => {
  const { t } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()

  const [news, setNews] = useState(null)
  const [loading, setLoading] = useState(true)
  const [likes, setLikes] = useState(0)
  const [dislikes, setDislikes] = useState(0)
  const [userVote, setUserVote] = useState(null)

  const getSessionToken = () => {
    let token = localStorage.getItem('session_token')
    if (!token) {
      token = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('session_token', token)
    }
    return token
  }

  // Обработка внешних ссылок
  const processExternalLinks = () => {
    const contentDiv = document.getElementById('news-content')
    if (contentDiv) {
      const links = contentDiv.querySelectorAll('a')
      links.forEach(link => {
        const href = link.getAttribute('href')
        if (href && (href.startsWith('http') || href.startsWith('https'))) {
          link.setAttribute('target', '_blank')
          link.setAttribute('rel', 'noopener noreferrer')
        }
      })
    }
  }

  // Загрузка новости
  useEffect(() => {
    const fetchNews = async () => {
      try {
        const res = await directusApi.get('/news', {
          params: {
            filter: JSON.stringify({
              _and: [
                { id: { _eq: id } },
                { is_arctic: { _eq: true } }
              ]
            }),
            limit: 1,
            fields: [
              'id',
              'title',
              'content',
              'content_clean',
              'publication_date',
              'summary_ai',
              'relevance_score',
              'source_id.id',
              'source_id.name',
              'source_id.rating',
              'tags.id',
              'tags.tags_id.id',
              'tags.tags_id.name',
              'tags.tags_id.color'
            ]
          }
        })

        const item = res.data.data?.[0] || null
        if (!item) {
          message.error(t('newsView.notArctic') || t('newsView.loadError'))
          navigate('/')
          return
        }

        setNews(item)
      } catch (e) {
        console.error(e)
        message.error(t('newsView.loadError'))
      } finally {
        setLoading(false)
      }
    }
    fetchNews()
  }, [id, navigate, t])

  // Обрабатываем ссылки после загрузки контента
  useEffect(() => {
    if (news && (news.content || news.content_clean)) {
      setTimeout(processExternalLinks, 100)
    }
  }, [news])

  // Загрузка реакций
  useEffect(() => {
    const loadReactions = async () => {
      try {
        const [likesRes, dislikesRes] = await Promise.all([
          directusApi.get('/news_reactions', {
            params: {
              'filter[news_id][_eq]': id,
              'filter[reaction_type][_eq]': 'like',
              aggregate: { count: '*' }
            }
          }),
          directusApi.get('/news_reactions', {
            params: {
              'filter[news_id][_eq]': id,
              'filter[reaction_type][_eq]': 'dislike',
              aggregate: { count: '*' }
            }
          })
        ])
        setLikes(likesRes.data.data?.[0]?.count || 0)
        setDislikes(dislikesRes.data.data?.[0]?.count || 0)

        const votes = await getAllVotes()
        if (votes[id]) {
          setUserVote(votes[id].voteType)
        }
      } catch (e) {
        console.error('Reactions load error:', e)
      }
    }
    loadReactions()
  }, [id])

  const likeMutation = useMutation({
    mutationFn: async ({ newsId, isRemoving, sessionToken }) => {
      if (isRemoving) {
        const reaction = await getUserReaction(newsId, sessionToken)
        if (reaction.data?.[0]?.id) {
          return await removeReaction(reaction.data[0].id)
        }
      } else {
        return await addReaction(newsId, sessionToken, 'like')
      }
    },
    onSuccess: () => {
      const updateCounts = async () => {
        const [likesRes, dislikesRes] = await Promise.all([
          directusApi.get('/news_reactions', {
            params: {
              'filter[news_id][_eq]': id,
              'filter[reaction_type][_eq]': 'like',
              aggregate: { count: '*' }
            }
          }),
          directusApi.get('/news_reactions', {
            params: {
              'filter[news_id][_eq]': id,
              'filter[reaction_type][_eq]': 'dislike',
              aggregate: { count: '*' }
            }
          })
        ])
        setLikes(likesRes.data.data?.[0]?.count || 0)
        setDislikes(dislikesRes.data.data?.[0]?.count || 0)
      }
      updateCounts()
    },
    onError: () => message.error(t('newsView.voteError'))
  })

  const dislikeMutation = useMutation({
    mutationFn: async ({ newsId, isRemoving, sessionToken }) => {
      if (isRemoving) {
        const reaction = await getUserReaction(newsId, sessionToken)
        if (reaction.data?.[0]?.id) {
          return await removeReaction(reaction.data[0].id)
        }
      } else {
        return await addReaction(newsId, sessionToken, 'dislike')
      }
    },
    onSuccess: () => {
      const updateCounts = async () => {
        const [likesRes, dislikesRes] = await Promise.all([
          directusApi.get('/news_reactions', {
            params: {
              'filter[news_id][_eq]': id,
              'filter[reaction_type][_eq]': 'like',
              aggregate: { count: '*' }
            }
          }),
          directusApi.get('/news_reactions', {
            params: {
              'filter[news_id][_eq]': id,
              'filter[reaction_type][_eq]': 'dislike',
              aggregate: { count: '*' }
            }
          })
        ])
        setLikes(likesRes.data.data?.[0]?.count || 0)
        setDislikes(dislikesRes.data.data?.[0]?.count || 0)
      }
      updateCounts()
    },
    onError: () => message.error(t('newsView.voteError'))
  })

  const handleLike = async () => {
    const sessionToken = getSessionToken()
    const currentVote = userVote

    if (currentVote === 'like') {
      await likeMutation.mutateAsync({ newsId: id, isRemoving: true, sessionToken })
      await removeVote(id)
      setUserVote(null)
      message.success(t('newsView.likeRemoved'))
    } else {
      if (currentVote === 'dislike') {
        await dislikeMutation.mutateAsync({ newsId: id, isRemoving: true, sessionToken })
        await removeVote(id)
      }
      await likeMutation.mutateAsync({ newsId: id, isRemoving: false, sessionToken })
      await registerVote(id, 'like')
      setUserVote('like')
      message.success(t('newsView.thanksForVote'))
    }
  }

  const handleDislike = async () => {
    const sessionToken = getSessionToken()
    const currentVote = userVote

    if (currentVote === 'dislike') {
      await dislikeMutation.mutateAsync({ newsId: id, isRemoving: true, sessionToken })
      await removeVote(id)
      setUserVote(null)
      message.success(t('newsView.dislikeRemoved'))
    } else {
      if (currentVote === 'like') {
        await likeMutation.mutateAsync({ newsId: id, isRemoving: true, sessionToken })
        await removeVote(id)
      }
      await dislikeMutation.mutateAsync({ newsId: id, isRemoving: false, sessionToken })
      await registerVote(id, 'dislike')
      setUserVote('dislike')
      message.success(t('newsView.thanksForVote'))
    }
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    message.success(t('newsView.linkCopied'))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    const locale = localStorage.getItem('i18nextLng') || 'ru'
    return new Date(dateStr).toLocaleDateString(locale === 'ru' ? 'ru-RU' : 'en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <Spin size="large" tip={t('newsView.loading')} />
      </div>
    )
  }

  if (!news) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Title level={3}>{t('newsView.notFound')}</Title>
        <Button type="primary" onClick={() => navigate('/catalog')}>{t('newsView.backToList')}</Button>
      </div>
    )
  }

  const tags = news.tags?.map(t => t.tags_id) || []
  const source = news.source_id

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px' }}>
      
      {/* Кнопка назад */}
      <Button 
        type="link" 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/catalog')}
        style={{ marginBottom: 16, paddingLeft: 0 }}
      >
        {t('newsView.backToNews')}
      </Button>

      {/* Заголовок */}
      <Title level={2} style={{ marginBottom: 16, fontSize: 'clamp(24px, 5vw, 32px)' }}>
        {news.title}
      </Title>

      {/* Мета-информация */}
      <Space wrap size={[16, 8]} style={{ marginBottom: 16, color: '#666' }}>
        <Text><CalendarOutlined /> {formatDate(news.publication_date)}</Text>
        {source && <Text><FieldTimeOutlined /> {t('newsView.source')}: {source.name}</Text>}
        {news.relevance_score && (
          <Tag color={news.relevance_score > 70 ? 'green' : news.relevance_score > 40 ? 'orange' : 'red'}>
            {t('newsView.relevance')}: {news.relevance_score}%
          </Tag>
        )}
      </Space>

      {/* Теги */}
      {tags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Space wrap size={[0, 8]}>
            {tags.map(tag => (
              <Tag key={tag.id} color={tag.color || '#4A90E2'}>
                {tag.name}
              </Tag>
            ))}
          </Space>
        </div>
      )}

      {/* Кнопки действий */}
      <Card size="small" style={{ marginBottom: 24, background: '#fafafa' }}>
        <Space size="middle">
          <Tooltip title={userVote === 'like' ? t('newsView.removeLike') : t('newsView.usefulNews')}>
            <Button
              icon={<LikeOutlined />}
              type={userVote === 'like' ? 'primary' : 'default'}
              onClick={handleLike}
              style={{ 
                backgroundColor: userVote === 'like' ? '#52c41a' : undefined,
                borderColor: userVote === 'like' ? '#52c41a' : undefined
              }}
            >
              {likes > 0 && likes}
            </Button>
          </Tooltip>

          <Tooltip title={userVote === 'dislike' ? t('newsView.removeDislike') : t('newsView.notUsefulNews')}>
            <Button
              icon={<DislikeOutlined />}
              danger
              type={userVote === 'dislike' ? 'primary' : 'default'}
              onClick={handleDislike}
            >
              {dislikes > 0 && dislikes}
            </Button>
          </Tooltip>

          <Tooltip title={t('newsView.share')}>
            <Button icon={<ShareAltOutlined />} onClick={copyLink}>
              {t('newsView.share')}
            </Button>
          </Tooltip>
        </Space>
      </Card>

      <Divider style={{ margin: '16px 0' }} />

      {/* Краткое содержание */}
      {news.summary_ai && (
        <>
          <Title level={4}>{t('newsView.summary')}</Title>
          <Paragraph style={{ fontSize: 16, lineHeight: 1.6, background: '#f9f9f9', padding: 16, borderRadius: 8 }}>
            {news.summary_ai}
          </Paragraph>
        </>
      )}

      {/* Полный текст - ИСПРАВЛЕНО: сначала content, потом content_clean */}
      <Title level={4}>{t('newsView.fullText')}</Title>
      <div
        id="news-content"
        style={{ 
          fontSize: 16, 
          lineHeight: 1.8,
          fontFamily: 'Georgia, serif'
        }}
        dangerouslySetInnerHTML={{
          __html: news.content || news.content_clean || t('newsView.noContent')
        }}
      />
    </div>
  )
}

export default NewsViewPage