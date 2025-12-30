/**
 * EventsList - Page publique listant tous les événements disponibles
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTicketAlt,
  FaSearch,
  FaFilter,
  FaClock,
  FaUsers
} from 'react-icons/fa';
import api from '../../api/api';
import { showError } from '../../utils/toast';
import PublicNavbar from '../../components/PublicNavbar';
import '../../styles/components.css';

function EventsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [eventType, setEventType] = useState('all'); // all, free, paid

  const [timeTick, setTimeTick] = useState(0);

  const isEventPast = (ev) => {
    const end = ev?.end_date ? new Date(ev.end_date) : null;
    const start = ev?.start_date ? new Date(ev.start_date) : null;
    const ref = end || start;
    if (!ref || Number.isNaN(ref.getTime())) return false;
    return ref.getTime() < Date.now();
  };

  useEffect(() => {
    fetchEvents();
    fetchCategories();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTimeTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      // Récupérer tous les événements publiés
      const response = await api.get('/api/v1/marketplace/events');
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      showError('Erreur lors du chargement des événements');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/v1/marketplace/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Filtrer les événements
  const filteredEvents = events.filter(event => {
    void timeTick;
    if (isEventPast(event)) return false;

    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = !selectedCategory || event.category_id === parseInt(selectedCategory);

    const matchesType = eventType === 'all' ||
                       (eventType === 'free' && event.is_free) ||
                       (eventType === 'paid' && !event.is_free);

    return matchesSearch && matchesCategory && matchesType;
  });

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price, currency) => {
    if (price === 0) return 'Gratuit';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0
    }).format(price);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {/* Navbar */}
      <PublicNavbar />

      {/* Hero Section */}
      <div className="ev-hero">
        <div className="ev-hero-container">
          <h1 className="ev-hero-title">Découvrez nos événements</h1>
          <p className="ev-hero-subtitle">Trouvez l'événement parfait pour vous</p>

          {/* Search Bar */}
          <div className="ev-hero-search">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un événement..."
            />
            <button>
              <FaSearch />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="ev-filters">
        <div className="ev-filters-container">
          <div className="ev-filters-label">
            <FaFilter />
            <span>Filtres :</span>
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="ev-filter-select"
          >
            <option value="">Toutes les catégories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          {/* Type Filter */}
          <div className="ev-filter-buttons">
            <button
              onClick={() => setEventType('all')}
              className={`ev-filter-btn ${eventType === 'all' ? 'active' : ''}`}
            >
              Tous
            </button>
            <button
              onClick={() => setEventType('free')}
              className={`ev-filter-btn ${eventType === 'free' ? 'active green' : ''}`}
            >
              Gratuit
            </button>
            <button
              onClick={() => setEventType('paid')}
              className={`ev-filter-btn ${eventType === 'paid' ? 'active blue' : ''}`}
            >
              Payant
            </button>
          </div>

          <div className="ev-filters-count">
            {filteredEvents.length} événement{filteredEvents.length > 1 ? 's' : ''}
          </div>
        </div>
      </div>

      {/* Events List */}
      <div className="ev-events-container">
        {loading ? (
          <div className="ev-loader" style={{ padding: '5rem 0' }}>
            <div className="ev-loader-spinner lg"></div>
            <span className="ev-loader-text">Chargement des événements...</span>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="ev-empty">
            <div className="ev-empty-icon">
              <FaCalendarAlt />
            </div>
            <h3 className="ev-empty-title">Aucun événement trouvé</h3>
            <p className="ev-empty-text">Essayez de modifier vos filtres de recherche</p>
          </div>
        ) : (
          <div className="ev-events-grid">
            {filteredEvents.map(event => (
              <div
                key={event.id}
                onClick={() => navigate(`/events/${event.id}`)}
                className="ev-event-card"
              >
                {/* Image */}
                <div className="ev-event-card-image">
                  {event.image_url ? (
                    <img src={event.image_url} alt={event.title} />
                  ) : (
                    <div className="ev-event-card-placeholder">
                      <FaCalendarAlt />
                    </div>
                  )}

                  {/* Badge */}
                  <div className={`ev-event-card-badge ${event.is_free ? 'free' : 'paid'}`}>
                    {event.is_free ? 'GRATUIT' : formatPrice(event.price, event.currency)}
                  </div>
                </div>

                {/* Content */}
                <div className="ev-event-card-body">
                  <h3 className="ev-event-card-title">{event.title}</h3>
                  <p className="ev-event-card-desc">{event.description}</p>

                  {/* Meta Info */}
                  <div className="ev-event-card-meta">
                    <div className="ev-event-card-meta-item">
                      <FaClock />
                      <span>{formatDate(event.start_date)}</span>
                    </div>

                    <div className="ev-event-card-meta-item">
                      <FaMapMarkerAlt />
                      <span>
                        {event.event_format === 'virtual' ? 'En ligne' : event.location || 'Lieu à confirmer'}
                      </span>
                    </div>

                    {event.available_seats !== null && (
                      <div className="ev-event-card-meta-item">
                        <FaUsers />
                        <span>{event.available_seats} places restantes</span>
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="ev-event-card-action">
                    <button className="ev-btn ev-btn-primary ev-btn-full">
                      <FaTicketAlt />
                      Voir les détails
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default EventsList;
