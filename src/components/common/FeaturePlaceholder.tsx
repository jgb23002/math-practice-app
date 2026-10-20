import usePageTitle from '../../hooks/usePageTitle'
import ButtonLink from './ButtonLink'
import Icon, { type IconName } from './Icon'

interface FeaturePlaceholderProps {
  title: string
  section: string
  description: string
  icon: IconName
  showPracticeLink?: boolean
}

function FeaturePlaceholder({
  title,
  section,
  description,
  icon,
  showPracticeLink = false,
}: FeaturePlaceholderProps) {
  usePageTitle(section)

  return (
    <section className="placeholder-page">
      <p className="eyebrow">{section}</p>
      <div className="placeholder-card">
        <span className="placeholder-icon">
          <Icon name={icon} />
        </span>
        <span className="coming-soon">Coming soon</span>
        <h1 id="page-heading">{title}</h1>
        <p className="placeholder-description">{description}</p>
        <div className="placeholder-actions">
          <ButtonLink to="/">Return Home</ButtonLink>
          {showPracticeLink && (
            <ButtonLink to="/practice/setup" variant="secondary">
              Explore Practice <Icon name="arrow" />
            </ButtonLink>
          )}
        </div>
      </div>
      <p className="supportive-note">
        <Icon name="heart" /> Every small step is something to be proud of.
      </p>
    </section>
  )
}

export default FeaturePlaceholder
