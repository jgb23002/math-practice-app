import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import MathFriends from '../components/common/MathFriends'
import usePageTitle from '../hooks/usePageTitle'

const operations = [
  { symbol: '+', label: 'Addition', color: 'blue' },
  { symbol: '−', label: 'Subtraction', color: 'peach' },
  { symbol: '×', label: 'Multiplication', color: 'green' },
  { symbol: '÷', label: 'Division', color: 'yellow' },
]

function HomePage() {
  usePageTitle('Home')

  return (
    <>
      <section className="home-hero" aria-labelledby="page-heading">
        <div className="hero-copy">
          <p className="eyebrow">
            <Icon name="sparkles" /> Hello, curious mind!
          </p>
          <h1 id="page-heading">
            {'A little practice. '}
            <span>A big adventure.</span>
          </h1>
          <p className="hero-description">
            Welcome to your happy place for math. Explore new skills, grow your
            confidence, and take it one little step at a time.
          </p>
          <ButtonLink to="/practice/setup" className="hero-button">
            Start Practice <Icon name="arrow" />
          </ButtonLink>
          <p className="hero-reassurance">
            <Icon name="heart" /> Go at your own pace. Every try counts.
          </p>
        </div>
        <MathFriends />
      </section>

      <section className="skills-strip" aria-labelledby="skills-heading">
        <h2 id="skills-heading">So many ways to grow</h2>
        <ul className="skills-list">
          {operations.map(({ symbol, label, color }) => (
            <li key={label}>
              <span
                className={`operation-symbol operation-symbol--${color}`}
                aria-hidden="true"
              >
                {symbol}
              </span>
              {label}
            </li>
          ))}
        </ul>
      </section>

      <section className="home-explore" aria-labelledby="explore-heading">
        <div className="section-heading">
          <h2 id="explore-heading">Make yourself at home</h2>
          <span aria-hidden="true">A little look around ↘</span>
        </div>
        <div className="explore-grid">
          <article className="explore-card explore-card--green">
            <span className="explore-icon">
              <Icon name="chart" />
            </span>
            <div className="explore-copy">
              <h3>Little steps add up.</h3>
              <p>
                Your progress will have a home here. Watch your confidence grow!
              </p>
              <ButtonLink to="/statistics" variant="secondary">
                View Statistics <Icon name="arrow" />
              </ButtonLink>
            </div>
          </article>
          <article className="explore-card explore-card--peach">
            <span className="explore-icon">
              <Icon name="settings" />
            </span>
            <div className="explore-copy">
              <h3>Your practice, your way.</h3>
              <p>
                A space for the little things that make learning feel like you.
              </p>
              <ButtonLink to="/settings" variant="secondary">
                Settings <Icon name="arrow" />
              </ButtonLink>
            </div>
          </article>
        </div>
      </section>
    </>
  )
}

export default HomePage
