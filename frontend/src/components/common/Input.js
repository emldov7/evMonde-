/**
 * Input - Composant champ de saisie réutilisable avec design moderne
 */

import { useState } from 'react';
import { FaExclamationCircle, FaEye, FaEyeSlash } from 'react-icons/fa';
import '../../styles/components.css';

function Input({
  label,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  success = false,
  disabled = false,
  required = false,
  icon,
  name,
  id,
  autoComplete,
  min,
  max,
  step,
  maxLength,
  className = ''
}) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  const groupClasses = [
    'ev-input-group',
    error ? 'error' : '',
    success ? 'success' : ''
  ].filter(Boolean).join(' ');

  const wrapperClasses = [
    'ev-input-wrapper',
    icon ? 'has-icon' : '',
    isPassword ? 'has-suffix' : ''
  ].filter(Boolean).join(' ');

  return (
    <div className={groupClasses}>
      {/* Label */}
      {label && (
        <label className="ev-input-label" htmlFor={id || name}>
          {icon && <span style={{ marginRight: '0.25rem' }}>{icon}</span>}
          <span>{label}</span>
          {required && <span className="required">*</span>}
        </label>
      )}

      {/* Input Wrapper */}
      <div className={wrapperClasses}>
        {/* Icon (inside input) */}
        {icon && !label && (
          <span className="ev-input-icon">{icon}</span>
        )}

        {/* Input Field */}
        <input
          type={inputType}
          id={id || name}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete={autoComplete}
          min={min}
          max={max}
          step={step}
          maxLength={maxLength}
          className={`ev-input ${className}`}
        />

        {/* Password Toggle */}
        {isPassword && (
          <button
            type="button"
            className="ev-input-suffix"
            onClick={() => setShowPassword(!showPassword)}
            tabIndex={-1}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        )}
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

export default Input;
