/**
 * Card - Composant carte réutilisable avec design moderne
 */

import '../../styles/components.css';

function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  padding = true,
  className = '',
  onClick
}) {
  return (
    <div 
      className={`ev-card ${className}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : {}}
    >
      {/* Header */}
      {(title || headerAction) && (
        <div className="ev-card-header">
          <div>
            {title && <h3 className="ev-card-title">{title}</h3>}
            {subtitle && (
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0.25rem 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}

      {/* Body */}
      <div className={padding ? 'ev-card-body' : ''}>
        {children}
      </div>

      {/* Footer */}
      {footer && (
        <div className="ev-card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

export default Card;
