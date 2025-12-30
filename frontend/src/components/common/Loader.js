/**
 * Loader - Composant animation de chargement avec design moderne
 */

import '../../styles/components.css';

function Loader({
  size = 'md',
  text = '',
  fullPage = false,
  color = 'primary'
}) {
  const sizeClasses = {
    sm: 'sm',
    md: 'md',
    lg: 'lg'
  };

  const Spinner = () => (
    <div className="ev-loader">
      <div className={`ev-loader-spinner ${sizeClasses[size] || 'md'}`}></div>
      {text && <p className="ev-loader-text">{text}</p>}
    </div>
  );

  if (fullPage) {
    return (
      <div className="ev-loader-fullpage">
        <div className="ev-loader-card">
          <Spinner />
        </div>
      </div>
    );
  }

  return <Spinner />;
}

export default Loader;
