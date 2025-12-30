/**
 * Button - Composant bouton réutilisable avec design moderne
 */

import '../../styles/components.css';

function Button({
  children,
  text,
  onClick,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  className = ''
}) {
  const variantClasses = {
    primary: 'ev-btn-primary',
    secondary: 'ev-btn-secondary',
    success: 'ev-btn-success',
    danger: 'ev-btn-danger',
    warning: 'ev-btn-warning',
    ghost: 'ev-btn-ghost',
    outline: 'ev-btn-outline'
  };

  const sizeClasses = {
    sm: 'ev-btn-sm',
    md: '',
    lg: 'ev-btn-lg',
    xl: 'ev-btn-xl'
  };

  const classes = [
    'ev-btn',
    variantClasses[variant] || variantClasses.primary,
    sizeClasses[size] || '',
    fullWidth ? 'ev-btn-full' : '',
    loading ? 'ev-btn-loading' : '',
    className
  ].filter(Boolean).join(' ');

  const content = children || text;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={classes}
    >
      {/* Icon Left */}
      {icon && iconPosition === 'left' && !loading && (
        <span style={{ display: 'flex', fontSize: '1.1em' }}>{icon}</span>
      )}

      {/* Loading Spinner */}
      {loading && (
        <span className="ev-loader-spinner sm" style={{ position: 'static', borderTopColor: 'currentColor' }}></span>
      )}

      {/* Text Content */}
      {content && <span>{loading ? 'Chargement...' : content}</span>}

      {/* Icon Right */}
      {icon && iconPosition === 'right' && !loading && (
        <span style={{ display: 'flex', fontSize: '1.1em' }}>{icon}</span>
      )}
    </button>
  );
}

export default Button;
