import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/layout.jsx'
import Plants from './pages/plants.jsx'
import AddPlant from './pages/add_plant.jsx'
import PlantDetails from './pages/plant_details.jsx'
import AppSettings from './pages/app_settings.jsx'
import About from './pages/about.jsx'

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Plants />} />
          <Route path="/add" element={<AddPlant />} />
          <Route path="/plant/:id" element={<PlantDetails />} />
          <Route path="/settings" element={<AppSettings />} />
          <Route path="/about" element={<About />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}

export default App
