/**
 * Badge - Composant badge/étiquette réutilisable
 */

import '../../styles/components.css';

function Badge({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  className = ''
}) {
  const variantClasses = {
    primary: 'ev-badge-primary',
    success: 'ev-badge-success',
    warning: 'ev-badge-warning',
    danger: 'ev-badge-danger',
    info: 'ev-badge-info',
    gray: 'ev-badge-gray'
  };

  const sizeStyles = {
    sm: { fontSize: '0.65rem', padding: '0.25rem 0.5rem' },
    md: {},
    lg: { fontSize: '0.85rem', padding: '0.5rem 1rem' }
  };

  return (
    <span 
      className={`ev-badge ${variantClasses[variant] || variantClasses.primary} ${className}`}
      style={sizeStyles[size] || {}}
    >
      {icon && <span style={{ display: 'flex' }}>{icon}</span>}
      {children}
    </span>
  );
}

export default Badge;
