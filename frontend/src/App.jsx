import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MainLayout from './components/Layout/MainLayout'
import HomePage from './pages/HomePage'
import CatalogPage from './pages/CatalogPage'
import DigestsPage from './pages/DigestsPage'
import DigestViewPage from './pages/DigestViewPage'
import SourcesPage from './pages/SourcesPage'
import NewsViewPage from './pages/NewsViewPage'
import AnalyticsPage from './pages/AnalyticsPage'

function App() {
  return (
      <BrowserRouter>
        <Routes>
          {/* Публичные страницы */}
          <Route path="/" element={<MainLayout><HomePage /></MainLayout>} />
          <Route path="/catalog" element={<MainLayout><CatalogPage /></MainLayout>} />
          <Route path="/digests" element={<MainLayout><DigestsPage /></MainLayout>} />
          <Route path="/news/:id" element={<MainLayout><NewsViewPage /></MainLayout>} />
          <Route path="/analytics" element={<MainLayout><AnalyticsPage /></MainLayout>} />
          <Route path="/digests/:type/:id" element={<MainLayout><DigestViewPage /></MainLayout>} />
          <Route path="/sources" element={<MainLayout><SourcesPage /></MainLayout>} />
        </Routes>
      </BrowserRouter>
  )
}

export default App