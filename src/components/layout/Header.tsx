import { Link } from 'react-router'
import Navigation from './Navigation'

function Header() {
  return (
    <header className="app-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Math Practice home">
          <span className="brand-mark" aria-hidden="true">
            <span>+</span>
            <span>−</span>
            <span>×</span>
            <span>÷</span>
          </span>
          <span className="brand-name">
            Math <span>Practice</span>
          </span>
        </Link>
        <Navigation />
      </div>
    </header>
  )
}

export default Header
