import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AppProvider, useApp } from './contexts/app_context.jsx'
import Layout from './components/layout.jsx'
import Plants from './pages/plants.jsx'
import AddPlant from './pages/add_plant.jsx'
import PlantDetails from './pages/plant_details.jsx'
import AppSettings from './pages/app_settings.jsx'
import About from './pages/about.jsx'
import ConfirmModal from './components/confirm_modal.jsx'
import ToastHost from './components/toast.jsx'
import SplashScreen from './components/splash_screen.jsx'

function AppContent() {
  const { confirmState, hideConfirm, toasts, removeToast } = useApp()
  const [splashComplete, setSplashComplete] = useState(false)

  if (!splashComplete) {
    return <SplashScreen onComplete={() => setSplashComplete(true)} />
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Plants />} />
          <Route path="/add" element={<AddPlant />} />
          <Route path="/plant/:id" element={<PlantDetails />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="/about" element={<About />} />
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
