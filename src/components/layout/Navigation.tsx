import { Link, useLocation } from 'react-router'
import Icon, { type IconName } from '../common/Icon'

const navigationItems: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Home', icon: 'home' },
  { to: '/practice/setup', label: 'Practice', icon: 'sparkles' },
  { to: '/statistics', label: 'Statistics', icon: 'chart' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

function Navigation() {
  const { pathname } = useLocation()

  return (
    <nav aria-label="Main navigation">
      <ul className="navigation">
        {navigationItems.map(({ to, label, icon }) => {
          const isPracticePage =
            to === '/practice/setup' && pathname.startsWith('/practice/')
          const isActive = pathname === to || isPracticePage

          return (
            <li key={to}>
              <Link
                to={to}
                aria-current={isActive ? 'page' : undefined}
                className={`nav-link${isActive ? ' is-active' : ''}`}
              >
                <Icon name={icon} />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export default Navigation
