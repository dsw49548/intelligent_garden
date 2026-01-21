import { Link } from 'react-router-dom'

function Drawer({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <>
      <div className="drawer_overlay" onClick={onClose}></div>
      <div className={`drawer ${isOpen ? 'drawer_open' : ''}`}>
        <div className="drawer_header">
          <h2>Menu</h2>
          <button className="drawer_close" onClick={onClose}>×</button>
        </div>
        <nav className="drawer_nav">
          <Link to="/" onClick={onClose}>Plants</Link>
          <Link to="/settings" onClick={onClose}>App Settings</Link>
          <Link to="/about" onClick={onClose}>About</Link>
        </nav>
        <div className="drawer_footer">
          <p>Version 1.0.0</p>
        </div>
      </div>
    </>
  )
}

export default Drawer
