import { Link, type LinkProps } from 'react-router'

interface ButtonLinkProps extends LinkProps {
  variant?: 'primary' | 'secondary'
}

function ButtonLink({
  variant = 'primary',
  className = '',
  children,
  ...props
}: ButtonLinkProps) {
  return (
    <Link className={`button button--${variant} ${className}`} {...props}>
      {children}
    </Link>
  )
}

export default ButtonLink
