/**
 * EmptyState - Composant état vide réutilisable
 */

import '../../styles/components.css';

function EmptyState({
  icon,
  title = 'Aucun élément',
  description,
  action,
  className = ''
}) {
  return (
    <div className={`ev-empty ${className}`}>
      {icon && (
        <div className="ev-empty-icon">
          {icon}
        </div>
      )}
      
      <h3 className="ev-empty-title">{title}</h3>
      
      {description && (
        <p className="ev-empty-text">{description}</p>
      )}
      
      {action && (
        <div style={{ marginTop: '1rem' }}>
          {action}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
