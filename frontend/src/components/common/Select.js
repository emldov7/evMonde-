/**
 * Select - Composant select/dropdown réutilisable avec design moderne
 */

import { FaExclamationCircle } from 'react-icons/fa';
import '../../styles/components.css';

function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Sélectionner...',
  error = '',
  disabled = false,
  required = false,
  name,
  id,
  className = ''
}) {
  const groupClasses = [
    'ev-input-group',
    error ? 'error' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={groupClasses}>
      {/* Label */}
      {label && (
        <label className="ev-input-label" htmlFor={id || name}>
          <span>{label}</span>
          {required && <span className="required">*</span>}
        </label>
      )}

      {/* Select */}
      <div className="ev-input-wrapper">
        <select
          id={id || name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`ev-input ev-select ${className}`}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option, index) => (
            <option 
              key={option.value || index} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error Message */}
      {error && (
        <div className="ev-input-error">
          <FaExclamationCircle />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}

export default Select;
