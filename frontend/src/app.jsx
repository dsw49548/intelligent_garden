import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/app_context.jsx'
import Layout from './components/layout.jsx'
import Plants from './pages/plants.jsx'
import AddPlant from './pages/add_plant.jsx'
import PlantDetails from './pages/plant_details.jsx'
import PlantStats from './pages/plant_stats.jsx'
import AppSettings from './pages/app_settings.jsx'
import About from './pages/about.jsx'
import Auth from './pages/auth.jsx'
import ConfirmModal from './components/confirm_modal.jsx'
import ToastHost from './components/toast.jsx'
import SplashScreen from './components/splash_screen.jsx'
import { getToken } from './storage.js'

function AppContent() {
  const { confirmState, hideConfirm, toasts, removeToast } = useApp()
  const [splashComplete, setSplashComplete] = useState(false)
  const location = useLocation()

  if (!splashComplete) {
    return <SplashScreen onComplete={() => setSplashComplete(true)} />
  }

  const loggedIn = Boolean(getToken())
  const authPage = location.pathname === '/login' || location.pathname === '/register'
  if (loggedIn === authPage) {
    return <Navigate to={loggedIn ? '/' : '/login'} replace />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Plants />} />
          <Route path="/add" element={<AddPlant />} />
          <Route path="/plant/:id" element={<PlantDetails />} />
          <Route path="/plant/:id/stats" element={<PlantStats />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="/about" element={<About />} />
          <Route path="/login" element={<Auth mode="login" />} />
          <Route path="/register" element={<Auth mode="register" />} />
        </Routes>
      </Layout>
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmLabel={confirmState.confirmLabel || 'Delete'}
        onConfirm={confirmState.onConfirm || (() => {})}
        onCancel={hideConfirm}
      />
      <ToastHost toasts={toasts} removeToast={removeToast} />
    </>
  )
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
