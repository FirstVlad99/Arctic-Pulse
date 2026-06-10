// src/components/MainLayout.jsx
import { useState, useEffect } from 'react'
import { Layout, Input, Drawer, message } from 'antd'
import { useTranslation } from 'react-i18next'
import { 
  MenuOutlined,
  SearchOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import LanguageSwitcher from '../LanguageSwitcher'
import './MainLayout.css'

const { Header, Content, Footer } = Layout

const AuroraIcon = ({ size = 32 }) => (
  <svg viewBox="-5 -3 165 102" height={size} width={size * (200 / 175)} aria-label="Aurora borealis" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {[
        ['al1','#1a6abf'],['al2','#1970b7'],['al3','#1876af'],
        ['al4','#16829f'],['al5','#158897'],['al6','#148e8f'],
        ['al7','#129487'],['al8','#119a7e'],['al9','#10a076'],
        ['al10','#0fa570'],['al11','#0faa68'],['al12','#0faa68'],
      ].map(([id, color]) => (
        <linearGradient key={id} id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.05" />
          <stop offset="100%" stopColor={color} stopOpacity="0.92" />
        </linearGradient>
      ))}
    </defs>
    <rect fill="url(#al1)"  height="77" rx="4.5" transform="rotate(-4,   4.5, 92)" width="9" x="0"   y="15" />
    <rect fill="url(#al2)"  height="80" rx="4.5" transform="rotate(-3,  17.5, 91)" width="9" x="13"  y="11" />
    <rect fill="url(#al3)"  height="81" rx="4.5" transform="rotate(-2,  30.5, 89)" width="9" x="26"  y="8"  />
    <rect fill="url(#al4)"  height="82" rx="4.5" transform="rotate(-1,  43.5, 89)" width="9" x="39"  y="7"  />
    <rect fill="url(#al5)"  height="81" rx="4.5" transform="rotate( 0,  56.5, 89)" width="9" x="52"  y="8"  />
    <rect fill="url(#al6)"  height="80" rx="4.5" transform="rotate( 1,  69.5, 91)" width="9" x="65"  y="11" />
    <rect fill="url(#al7)"  height="77" rx="4.5" transform="rotate( 2,  82.5, 92)" width="9" x="78"  y="15" />
    <rect fill="url(#al8)"  height="75" rx="4.5" transform="rotate( 3,  95.5, 94)" width="9" x="91"  y="19" />
    <rect fill="url(#al9)"  height="73" rx="4.5" transform="rotate( 4,108.5, 95)" width="9" x="104" y="22" />
    <rect fill="url(#al10)" height="72" rx="4.5" transform="rotate( 5,121.5, 95)" width="9" x="117" y="23" />
    <rect fill="url(#al11)" height="73" rx="4.5" transform="rotate( 4,134.5, 95)" width="9" x="130" y="22" />
    <rect fill="url(#al12)" height="75" rx="4.5" transform="rotate( 3,147.5, 94)" width="9" x="143" y="19" />
  </svg>
)

const COLORS = {
  textDarkBlue: '#0A2B4E',
  pillBg: 'rgba(247, 247, 247, 0.9)',
  pillBorder: 'rgba(200, 204, 209, 0.65)',
  pillShadow: '0 8px 24px rgba(0, 144, 255, 0.08)',
  hoverBg: 'rgba(160, 200, 255, 0.55)',
}

const MainLayout = ({ children }) => {
  const { t } = useTranslation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(window.innerWidth < 1100)
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleResize = () => {
      setIsMobileOrTablet(window.innerWidth < 1100)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Функция поиска - перенаправляет на каталог с параметром search
  const handleSearch = (value) => {
    if (!value || !value.trim()) {
      message.warning(t('common.enterSearchTerm'))
      return
    }
    
    const trimmedValue = value.trim()
    console.log('search:', trimmedValue)
    
    // Закрываем модальное окно если оно открыто
    if (searchModalOpen) {
      setSearchModalOpen(false)
    }
    
    // Очищаем поле поиска
    setSearchValue('')
    
    // Перенаправляем на страницу каталога с параметром поиска
    navigate(`/catalog?search=${encodeURIComponent(trimmedValue)}`)
  }

  // Пункты меню с переводами
  const allNavItems = [
    { key: '/', label: t('navigation.home') },
    { key: '/catalog', label: t('navigation.catalog') },
    { key: '/digests', label: t('navigation.digests') },
    { key: '/analytics', label: t('navigation.analytics') },
    { key: '/sources', label: t('navigation.sources') },
  ]

  const handleNavClick = (path) => {
    navigate(path)
    setMobileMenuOpen(false)
  }

  // Мобильное меню - выезжает справа с крестиком в правом верхнем углу
  const MobileMenu = () => (
    <Drawer
      title={t('common.menu')}
      placement="right"
      onClose={() => setMobileMenuOpen(false)}
      open={mobileMenuOpen}
      styles={{ 
        body: { padding: 0 },
        header: { 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: '1px solid #f0f0f0'
        }
      }}
      closeIcon={null}
      width={280}
      extra={
        <button
          onClick={() => setMobileMenuOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: COLORS.textDarkBlue,
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CloseOutlined />
        </button>
      }
    >
      <div style={{ padding: '16px' }}>
        {allNavItems.map(item => (
          <button
            key={item.key}
            onClick={() => handleNavClick(item.key)}
            style={{
              display: 'block',
              width: '100%',
              textAlign: 'left',
              padding: '12px 16px',
              background: location.pathname === item.key ? COLORS.hoverBg : 'transparent',
              border: 'none',
              borderRadius: 8,
              color: COLORS.textDarkBlue,
              fontWeight: location.pathname === item.key ? 'bold' : 'normal',
              cursor: 'pointer',
              marginBottom: 4,
              fontSize: 15
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </Drawer>
  )

  // Мобильный поиск
  const MobileSearch = () => (
    <Drawer
      title={t('common.search')}
      placement="top"
      onClose={() => setSearchModalOpen(false)}
      open={searchModalOpen}
      height="auto"
      styles={{ body: { padding: 16 } }}
      closeIcon={null}
      extra={
        <button
          onClick={() => setSearchModalOpen(false)}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: 16,
            color: COLORS.textDarkBlue,
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CloseOutlined />
        </button>
      }
    >
      <Input.Search
        placeholder={t('common.searchPlaceholder')}
        size="large"
        autoFocus
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        onSearch={handleSearch}
        enterButton
      />
    </Drawer>
  )

  return (
    <Layout style={{
      minHeight: '100vh',
      background: 'linear-gradient(180deg, var(--ruwiki-blue) 0, rgba(160, 200, 255, -1) 270px, var(--ruwiki-gray-light) 100px)',
    }}>
      <Header style={{
        background: 'transparent',
        position: 'sticky',
        top: 20,
        zIndex: 1000,
        height: 'auto',
        padding: 0,
        lineHeight: 'normal',
      }}>
        <div style={{
          width: 'calc(100% - 40px)',
          maxWidth: 1120,
          margin: '0 auto',
          background: COLORS.pillBg,
          backdropFilter: 'blur(12px)',
          borderRadius: 50,
          padding: isMobileOrTablet ? '8px 16px' : '10px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: COLORS.pillShadow,
          border: `1px solid ${COLORS.pillBorder}`,
        }}>
          <Link to="/" style={{ 
            color: COLORS.textDarkBlue, 
            fontSize: isMobileOrTablet ? '16px' : '22px', 
            fontWeight: '400',
            fontStyle: 'italic',
            textDecoration: 'none', 
            display: 'flex', 
            alignItems: 'center', 
            gap: 8 
          }}>
            <AuroraIcon size={isMobileOrTablet ? 26 : 40} />
            {t('brand.name')}
          </Link>

          {/* Десктопное меню - только на больших экранах */}
          {!isMobileOrTablet && (
            <div style={{ display: 'flex', gap: 28, marginLeft: 40 }}>
              {allNavItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNavClick(item.key)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: location.pathname === item.key ? COLORS.textDarkBlue : COLORS.textDarkBlue,
                    fontSize: 14,
                    fontWeight: location.pathname === item.key ? 'bold' : '400',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    padding: '8px 0',
                    borderBottom: location.pathname === item.key ? `2px solid ${COLORS.textDarkBlue}` : '2px solid transparent',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: isMobileOrTablet ? 12 : 20 }}>
            {/* Поиск - на десктопе поле ввода, на мобильных/планшетах иконка */}
            {!isMobileOrTablet ? (
              <Input.Search
                placeholder={t('common.searchPlaceholder')}
                style={{ width: 180 }}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onSearch={handleSearch}
              />
            ) : (
              <SearchOutlined 
                style={{ fontSize: 18, color: COLORS.textDarkBlue, cursor: 'pointer' }} 
                onClick={() => setSearchModalOpen(true)}
              />
            )}

            <LanguageSwitcher />

            {/* Бургер-меню только на мобильных и планшетах - открывается справа */}
            {isMobileOrTablet && (
              <MenuOutlined 
                style={{ fontSize: 18, color: COLORS.textDarkBlue, cursor: 'pointer' }}
                onClick={() => setMobileMenuOpen(true)}
              />
            )}
          </div>
        </div>
      </Header>

      <Content className={`main-layout-content${isMobileOrTablet ? ' is-mobile' : ''}`} style={{
        padding: isMobileOrTablet ? '16px' : '24px',
        minHeight: 'calc(100vh - 64px - 70px)'
      }}>
        {children}
      </Content>

      <Footer style={{ 
        textAlign: 'center', 
        background: '#0A2B4E', 
        color: 'rgba(255,255,255,0.7)',
        padding: isMobileOrTablet ? '16px' : '24px',
        fontSize: isMobileOrTablet ? '11px' : '14px'
      }}>
        {t('footer.copyright')}
      </Footer>

      <MobileMenu />
      <MobileSearch />
    </Layout>
  )
}

export default MainLayout