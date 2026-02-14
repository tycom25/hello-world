import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <header className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <svg width="32" height="32" viewBox="0 0 100 100">
            <rect width="100" height="100" rx="15" fill="#232F3E"/>
            <text x="50" y="65" fontSize="50" textAnchor="middle" fill="#FF9900" fontFamily="Arial, sans-serif" fontWeight="bold">AB</text>
          </svg>
          <span className="brand-text">Amazon Business</span>
          <span className="brand-tag">Sales Query Portal</span>
        </Link>
      </div>
      <div className="navbar-actions">
        <div className="user-info">
          <div className="avatar">ST</div>
          <span>Sales Team</span>
        </div>
      </div>
    </header>
  )
}
