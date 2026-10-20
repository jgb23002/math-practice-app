import ButtonLink from '../components/common/ButtonLink'
import Icon from '../components/common/Icon'
import usePageTitle from '../hooks/usePageTitle'

function NotFoundPage() {
  usePageTitle('Page not found')

  return (
    <section className="placeholder-page">
      <div className="placeholder-card not-found-card">
        <span className="lost-numbers" aria-hidden="true">
          4<span>0</span>4
        </span>
        <p className="eyebrow">Let&apos;s find our way</p>
        <h1 id="page-heading">Oops! This page wandered off.</h1>
        <p className="placeholder-description">
          That&apos;s okay. A new adventure is just a click away. Let&apos;s
          head back to a place we know.
        </p>
        <ButtonLink to="/">
          Return Home <Icon name="arrow" />
        </ButtonLink>
      </div>
    </section>
  )
}

export default NotFoundPage
