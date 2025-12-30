/**
 * Textarea - Composant zone de texte réutilisable avec design moderne
 */

import { FaExclamationCircle } from 'react-icons/fa';
import '../../styles/components.css';

function Textarea({
  label,
  value,
  onChange,
  placeholder = '',
  error = '',
  disabled = false,
  required = false,
  name,
  id,
  rows = 4,
  maxLength,
  showCount = false,
  className = ''
}) {
  const groupClasses = [
    'ev-input-group',
    error ? 'error' : ''
  ].filter(Boolean).join(' ');

  const charCount = value?.length || 0;

  return (
    <div className={groupClasses}>
      {/* Label */}
      {label && (
        <label className="ev-input-label" htmlFor={id || name}>
          <span>{label}</span>
          {required && <span className="required">*</span>}
        </label>
      )}

      {/* Textarea */}
      <div className="ev-input-wrapper">
        <textarea
          id={id || name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          rows={rows}
          maxLength={maxLength}
          className={`ev-input ev-textarea ${className}`}
        />
      </div>

      {/* Footer: Error or Character Count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {/* Error Message */}
        {error && (
          <div className="ev-input-error">
            <FaExclamationCircle />
            <span>{error}</span>
          </div>
        )}

        {/* Character Count */}
        {showCount && maxLength && (
          <span style={{ 
            fontSize: '0.75rem', 
            color: charCount >= maxLength ? '#ef4444' : '#64748b',
            marginLeft: 'auto'
          }}>
            {charCount}/{maxLength}
          </span>
        )}
      </div>
    </div>
  );
}

export default Textarea;
