import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout.jsx'
import Home from './pages/home.jsx'
import Plant from './pages/plant.jsx'
import History from './pages/history.jsx'
import Settings from './pages/settings.jsx'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/plant/:id" element={<Plant />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
