/**
 * Créer un Événement - Formulaire multi-étapes pour créer un événement
 *
 * Étapes :
 * 1. Informations de base (titre, description, catégorie)
 * 2. Date & Lieu (date début/fin, lieu, type)
 * 3. Billets & Prix (types de billets, prix, quantités)
 * 4. Images & Médias (image couverture, gallery)
 * 5. Révision & Publication
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  FaInfoCircle,
  FaCalendarAlt,
  FaTicketAlt,
  FaImage,
  FaCheckCircle,
  FaArrowRight,
  FaArrowLeft,
  FaSave,
  FaMapMarkerAlt,
  FaVideo,
  FaGlobe,
  FaTrash,
  FaPlus
} from 'react-icons/fa';
import LayoutAdmin from '../../components/admin/LayoutAdmin';
import api from '../../api/api';
import { showSuccess, showError, showLoading, updateToSuccess, updateToError } from '../../utils/toast';
import '../../styles/admin.css';
import '../../styles/components.css';

function CreateEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams(); // Pour la modification
  const isEditMode = !!id; // Mode édition si ID présent
  const isSuperAdminMode = location.pathname.startsWith('/superadmin/');
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [organizers, setOrganizers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingEvent, setLoadingEvent] = useState(false);
  const [reminders, setReminders] = useState([]);
  const [initialReminderIds, setInitialReminderIds] = useState([]);

  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Informations de base
    title: '',
    description: '',
    organizer_id: '',
    category_id: '',
    tag_ids: [],

    // Step 2: Date & Lieu
    start_date: '',
    end_date: '',
    event_format: 'PHYSICAL', // PHYSICAL, VIRTUAL ou HYBRID
    location: '',
    address: '',
    city: '',
    country_code: 'TG',
    virtual_platform: 'zoom',
    virtual_meeting_url: '',
    virtual_meeting_id: '',
    virtual_meeting_password: '',
    virtual_instructions: '',

    // Step 3: Billets
    tickets: [
      {
        name: 'Standard',
        description: '',
        price: 0,
        currency: 'USD',
        quantity_available: 100
      }
    ],

    // Step 4: Images
    cover_image_url: '',
    gallery_images: [],

    // Publication
    status: 'DRAFT'
  });

  const getDefaultCurrencyByCountryCode = (code) => {
    const cc = String(code || '').toUpperCase();
    if (cc === 'FR') return 'USD';
    if (cc === 'CA') return 'USD';
    if (cc === 'TG' || cc === 'SN') return 'USD';
    return 'USD';
  };

  useEffect(() => {
    fetchCategoriesAndTags();
    if (isSuperAdminMode) {
      fetchOrganizers();
    }
    if (id) {
      fetchEventData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCategoriesAndTags = async () => {
    try {
      const [catResponse, tagResponse] = await Promise.all([
        api.get('/api/v1/marketplace/categories'),
        api.get('/api/v1/marketplace/tags')
      ]);

      setCategories(catResponse.data);
      setTags(tagResponse.data);
    } catch (error) {
      console.error('Error fetching categories/tags:', error);
    }
  };

  const fetchOrganizers = async () => {
    try {
      const response = await api.get('/api/v1/superadmin/users', {
        params: { role: 'organizer', limit: 500 }
      });
      setOrganizers(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Error fetching organizers:', error);
    }
  };

  const fetchEventData = async () => {
    setLoadingEvent(true);
    try {
      const response = await api.get(
        isSuperAdminMode ? `/api/v1/events/admin/events/${id}` : `/api/v1/events/my/events/${id}`
      );
      const event = response.data;

      try {
        const remindersResp = await api.get(`/api/v1/events/${id}/reminders`);
        const remindersList = Array.isArray(remindersResp.data) ? remindersResp.data : [];

        setReminders(
          remindersList
            .filter(r => !r.sent)
            .sort((a, b) => new Date(a.scheduled_at) - new Date(b.scheduled_at))
            .map(r => ({
              id: r.id,
              scheduled_at: r.scheduled_at ? String(r.scheduled_at).slice(0, 16) : '',
              message: r.message || ''
            }))
        );
        setInitialReminderIds(remindersList.map(r => r.id));
      } catch (e) {
        setReminders([]);
        setInitialReminderIds([]);
      }

      // Pré-remplir le formulaire avec les données de l'événement
      setFormData({
        title: event.title || '',
        description: event.description || '',
        organizer_id: event.organizer_id || '',
        category_id: event.category_id || '',
        tag_ids: event.tags?.map(tag => tag.id) || [],
        start_date: event.start_date ? event.start_date.slice(0, 16) : '', // Format datetime-local
        end_date: event.end_date ? event.end_date.slice(0, 16) : '',
        event_format: event.event_format?.toUpperCase() || 'PHYSICAL',
        location: event.location || '',
        address: event.address || '',
        city: event.city || '',
        country_code: event.country_code || 'TG',
        virtual_platform: event.virtual_platform || 'zoom',
        virtual_meeting_url: event.virtual_meeting_url || '',
        virtual_meeting_id: event.virtual_meeting_id || '',
        virtual_meeting_password: event.virtual_meeting_password || '',
        virtual_instructions: event.virtual_instructions || '',
        tickets: event.tickets?.length > 0 ? event.tickets.map(t => ({
          name: t.name,
          description: t.description || '',
          price: t.price,
          currency: t.currency,
          quantity_available: t.quantity_available
        })) : [
          {
            name: 'Standard',
            description: '',
            price: 0,
            currency: event.currency || getDefaultCurrencyByCountryCode(event.country_code || 'TG'),
            quantity_available: 100
          }
        ],
        cover_image_url: event.image_url || '',
        gallery_images: [],
        status: event.status || 'DRAFT'
      });
    } catch (error) {
      console.error('Error fetching event:', error);
      showError('Erreur lors du chargement de l\'événement');
      navigate(isSuperAdminMode ? '/superadmin/events' : '/admin/events');
    } finally {
      setLoadingEvent(false);
    }
  };

  const addReminderRow = () => {
    setReminders(prev => ([
      ...prev,
      { id: null, scheduled_at: '', message: '' }
    ]));
  };

  const updateReminderRow = (index, field, value) => {
    setReminders(prev => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };

  const removeReminderRow = async (index) => {
    const row = reminders[index];
    if (!row) return;

    if (row.id && id) {
      const toastId = showLoading('Suppression du rappel...');
      try {
        await api.delete(`/api/v1/events/${id}/reminders/${row.id}`);
        updateToSuccess(toastId, 'Rappel supprimé');
        setInitialReminderIds(prev => prev.filter(rid => rid !== row.id));
      } catch (error) {
        updateToError(toastId, error.response?.data?.detail || 'Erreur lors de la suppression');
        return;
      }
    }

    setReminders(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTicketChange = (index, field, value) => {
    const newTickets = [...formData.tickets];
    newTickets[index] = { ...newTickets[index], [field]: value };
    setFormData(prev => ({ ...prev, tickets: newTickets }));
  };

  const addTicket = () => {
    setFormData(prev => ({
      ...prev,
      tickets: [
        ...prev.tickets,
        {
          name: '',
          description: '',
          price: 0,
          currency: prev.tickets?.[0]?.currency || getDefaultCurrencyByCountryCode(prev.country_code || 'TG'),
          quantity_available: 50
        }
      ]
    }));
  };

  const removeTicket = (index) => {
    if (formData.tickets.length > 1) {
      setFormData(prev => ({
        ...prev,
        tickets: prev.tickets.filter((_, i) => i !== index)
      }));
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validation
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      showError('Format d\'image non supporté. Utilisez JPG, PNG, GIF ou WEBP');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      showError('L\'image est trop volumineuse. Maximum 5MB');
      return;
    }

    setUploadingImage(true);
    const toastId = showLoading('Upload de l\'image en cours...');

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await api.post('/api/v1/upload/image', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      handleChange('cover_image_url', response.data.url);
      updateToSuccess(toastId, 'Image uploadée avec succès !');
    } catch (error) {
      console.error('Error uploading image:', error);
      updateToError(toastId, error.response?.data?.detail || 'Erreur lors de l\'upload');
    } finally {
      setUploadingImage(false);
    }
  };

  const validateStep = (step) => {
    switch (step) {
      case 1:
        if (!formData.title || !formData.description || !formData.category_id) {
          showError('Veuillez remplir tous les champs obligatoires');
          return false;
        }

        if (isSuperAdminMode && !isEditMode && !formData.organizer_id) {
          showError('Veuillez sélectionner un organisateur');
          return false;
        }
        return true;

      case 2:
        if (!formData.start_date || !formData.event_format) {
          showError('Veuillez remplir la date et le format d\'événement');
          return false;
        }
        if ((formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') && !formData.location) {
          showError('Veuillez indiquer le lieu pour un événement physique ou hybride');
          return false;
        }
        if ((formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') && !formData.city) {
          showError('Veuillez indiquer la ville pour un événement physique ou hybride');
          return false;
        }
        if ((formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') && !formData.country_code) {
          showError('Veuillez sélectionner le pays pour un événement physique ou hybride');
          return false;
        }
        if ((formData.event_format === 'VIRTUAL' || formData.event_format === 'HYBRID') && !formData.virtual_meeting_url) {
          showError('Veuillez indiquer le lien de la réunion pour un événement virtuel ou hybride');
          return false;
        }
        if ((formData.event_format === 'VIRTUAL' || formData.event_format === 'HYBRID') && !formData.virtual_platform) {
          showError('Veuillez sélectionner la plateforme pour un événement virtuel ou hybride');
          return false;
        }
        return true;

      case 3:
        if (formData.tickets.some(t => !t.name || t.price < 0)) {
          showError('Veuillez remplir correctement tous les billets');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (publish = false) => {
    const toastId = showLoading(publish ? 'Publication en cours...' : 'Enregistrement en cours...');
    setLoading(true);

    try {
      // Déterminer si l'événement est gratuit
      // Un événement est gratuit si TOUS les tickets ont un prix de 0
      const isFree = formData.tickets.length > 0 ? formData.tickets.every(t => t.price === 0) : true;

      // Pour un événement payant, on doit avoir au moins un ticket avec prix > 0
      const hasPayingTickets = formData.tickets.some(t => t.price > 0);

      // Si on dit que c'est payant mais qu'il n'y a pas de ticket payant, c'est une erreur
      if (!isFree && !hasPayingTickets) {
        updateToError(toastId, 'Un événement payant doit avoir au moins un billet avec un prix supérieur à 0');
        setLoading(false);
        return;
      }

      // Préparer les données pour le backend (valeurs en minuscules pour les enums)
      const eventData = {
        ...(isSuperAdminMode && !id && formData.organizer_id
          ? { organizer_id: parseInt(formData.organizer_id) }
          : {}),
        title: formData.title,
        description: formData.description,
        full_description: formData.description,
        event_type: 'conference', // Enum en minuscules
        event_format: formData.event_format.toLowerCase(), // PHYSICAL -> physical
        start_date: formData.start_date,
        end_date: formData.end_date || formData.start_date,
        location: (formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') ? formData.location : null,
        address: (formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') ? (formData.address || formData.location) : null,
        city: (formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') ? formData.city : null,
        country_code: (formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') ? formData.country_code : null,
        virtual_platform: (formData.event_format === 'VIRTUAL' || formData.event_format === 'HYBRID') ? formData.virtual_platform : null,
        virtual_meeting_url: (formData.event_format === 'VIRTUAL' || formData.event_format === 'HYBRID') && formData.virtual_meeting_url ? formData.virtual_meeting_url : null,
        virtual_meeting_id: formData.virtual_meeting_id || null,
        virtual_meeting_password: formData.virtual_meeting_password || null,
        virtual_instructions: formData.virtual_instructions || null,
        is_free: isFree,
        price: isFree ? 0 : Math.min(...formData.tickets.filter(t => t.price > 0).map(t => t.price)),
        currency: formData.tickets?.[0]?.currency || getDefaultCurrencyByCountryCode(formData.country_code || 'TG'),
        image_url: formData.cover_image_url || null,
        category_id: formData.category_id ? parseInt(formData.category_id) : null,
        tag_ids: formData.tag_ids.map(id => parseInt(id)),
        // Si l'événement est gratuit, ne pas envoyer les tickets (backend n'en veut pas)
        // Si l'événement est payant, envoyer les tickets avec prix > 0
        tickets: isFree ? [] : formData.tickets.map(t => ({
          name: t.name,
          description: t.description || '',
          price: parseFloat(t.price),
          currency: t.currency,
          quantity_available: parseInt(t.quantity_available),
          is_active: true
        })),
      };

      // Pour un événement gratuit, ajouter une capacité basée sur les billets
      if (isFree && formData.tickets.length > 0) {
        eventData.capacity = formData.tickets.reduce((sum, t) => sum + parseInt(t.quantity_available), 0);
      }

      console.log('=== DONNÉES ENVOYÉES AU BACKEND ===');
      console.log('Event Format:', formData.event_format);
      console.log('Is Free:', isFree);
      console.log('Tickets:', formData.tickets);
      console.log('Event Data:', JSON.stringify(eventData, null, 2));
      console.log('===================================');

      if (id) {
        // Mode édition : mettre à jour l'événement existant
        await api.put(`/api/v1/events/${id}`, eventData);

        const currentIds = reminders.map(r => r.id).filter(Boolean);
        const deletedIds = initialReminderIds.filter(rid => !currentIds.includes(rid));

        for (const rid of deletedIds) {
          await api.delete(`/api/v1/events/${id}/reminders/${rid}`);
        }

        for (const r of reminders) {
          if (!r.scheduled_at) continue;
          if (r.id) {
            await api.put(`/api/v1/events/${id}/reminders/${r.id}`, {
              scheduled_at: r.scheduled_at,
              message: r.message || null
            });
          } else {
            await api.post(`/api/v1/events/${id}/reminders`, {
              scheduled_at: r.scheduled_at,
              message: r.message || null
            });
          }
        }

        updateToSuccess(toastId, 'Événement modifié avec succès !');
      } else {
        // Mode création : créer un nouvel événement
        const createdResp = await api.post('/api/v1/events', eventData);

        const createdEventId = createdResp?.data?.id;
        if (createdEventId) {
          for (const r of reminders) {
            if (!r.scheduled_at) continue;
            await api.post(`/api/v1/events/${createdEventId}/reminders`, {
              scheduled_at: r.scheduled_at,
              message: r.message || null
            });
          }
        }
        updateToSuccess(toastId, publish ? 'Événement publié avec succès !' : 'Événement sauvegardé en brouillon !');
      }

      setTimeout(() => {
        navigate(isSuperAdminMode ? '/superadmin/events' : '/admin/events');
      }, 1500);

    } catch (error) {
      console.error('Error creating event:', error);
      console.error('Error details:', error.response?.data);

      // Extraire le message d'erreur détaillé
      let errorMessage = 'Erreur lors de la création';
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          // Pydantic validation errors
          errorMessage = error.response.data.detail.map(err => {
            const field = err.loc?.join('.') || 'field';
            return `${field}: ${err.msg}`;
          }).join(', ');
        } else if (typeof error.response.data.detail === 'string') {
          errorMessage = error.response.data.detail;
        }
      }

      console.error('ERREUR COMPLÈTE:', errorMessage);
      updateToError(toastId, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Informations', icon: FaInfoCircle },
    { number: 2, title: 'Date & Lieu', icon: FaCalendarAlt },
    { number: 3, title: 'Billets', icon: FaTicketAlt },
    { number: 4, title: 'Images', icon: FaImage },
    { number: 5, title: 'Révision', icon: FaCheckCircle }
  ];

  return (
    <LayoutAdmin>
      {/* Loading state */}
      {loadingEvent && (
        <div className="admin-loading" style={{ minHeight: '60vh' }}>
          <div className="admin-spinner"></div>
          <p style={{ color: '#64748b', marginTop: '1rem' }}>Chargement de l'événement...</p>
        </div>
      )}

      {!loadingEvent && (
        <>
          {/* Page Header */}
          <div className="admin-page-header">
            <div className="admin-page-header-top">
              <div>
                <h1 className="admin-page-title">
                  {id ? 'Modifier l\'Événement' : 'Créer un Événement'}
                </h1>
                <p className="admin-page-subtitle">
                  {id ? 'Modifiez les informations de votre événement' : 'Remplissez les informations pour créer votre événement'}
                </p>
              </div>
            </div>
          </div>

      {/* Stepper */}
      <div className="ev-stepper">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.number;
          const isCompleted = currentStep > step.number;

          return (
            <div key={step.number} className="ev-stepper-item">
              <div className="ev-stepper-step">
                <div className={`ev-stepper-icon ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                  {isCompleted ? <FaCheckCircle /> : <Icon />}
                </div>
                <span className={`ev-stepper-label ${isActive ? 'active' : ''}`}>
                  {step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`ev-stepper-line ${isCompleted ? 'completed' : ''}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Form Content */}
      <div className="ev-form-card">

        {/* STEP 1: Informations de base */}
        {currentStep === 1 && (
          <div>
            <h2 className="ev-form-title">Informations de Base</h2>

            <div className="ev-form-grid">
              {isSuperAdminMode && !isEditMode && (
                <div className="ev-input-group">
                  <label className="ev-input-label">
                    Organisateur <span className="required">*</span>
                  </label>
                  <select
                    value={formData.organizer_id}
                    onChange={(e) => handleChange('organizer_id', e.target.value)}
                    className="ev-input ev-select"
                    required
                  >
                    <option value="">Sélectionnez un organisateur</option>
                    {organizers.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.first_name} {o.last_name} ({o.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Titre */}
              <div className="ev-form-full ev-input-group">
                <label className="ev-input-label">
                  Titre de l'événement <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="ev-input"
                  placeholder="Ex: Festival Jazz International 2025"
                />
              </div>

              {/* Description */}
              <div className="ev-form-full ev-input-group">
                <label className="ev-input-label">
                  Description <span className="required">*</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={5}
                  className="ev-input ev-textarea"
                  placeholder="Décrivez votre événement en détail..."
                />
              </div>

              {/* Catégorie */}
              <div className="ev-input-group">
                <label className="ev-input-label">
                  Catégorie <span className="required">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleChange('category_id', e.target.value)}
                  className="ev-input ev-select"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div className="ev-input-group">
                <label className="ev-input-label">Tags (optionnel)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tags.map(tag => (
                    <label
                      key={tag.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: 500,
                        transition: 'all 0.2s',
                        background: formData.tag_ids.includes(tag.id) ? 'linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)' : '#f1f5f9',
                        color: formData.tag_ids.includes(tag.id) ? 'white' : '#64748b'
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={formData.tag_ids.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleChange('tag_ids', [...formData.tag_ids, tag.id]);
                          } else {
                            handleChange('tag_ids', formData.tag_ids.filter(id => id !== tag.id));
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Date & Lieu */}
        {currentStep === 2 && (
          <div>
            <h2 className="ev-form-title">Date & Lieu</h2>

            {/* Dates */}
            <div className="ev-form-grid">
              <div className="ev-input-group">
                <label className="ev-input-label">
                  <FaCalendarAlt />
                  Date de début <span className="required">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.start_date}
                  onChange={(e) => handleChange('start_date', e.target.value)}
                  className="ev-input"
                />
              </div>

              <div className="ev-input-group">
                <label className="ev-input-label">
                  <FaCalendarAlt />
                  Date de fin
                </label>
                <input
                  type="datetime-local"
                  value={formData.end_date}
                  onChange={(e) => handleChange('end_date', e.target.value)}
                  className="ev-input"
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', margin: 0 }}>Rappels</h3>
                <button type="button" onClick={addReminderRow} className="admin-btn admin-btn-secondary" style={{ height: 42 }}>
                  <FaPlus />
                  Ajouter un rappel
                </button>
              </div>

              {reminders.length === 0 ? (
                <p style={{ color: '#64748b', marginTop: '0.75rem' }}>Aucun rappel programmé.</p>
              ) : (
                <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {reminders.map((r, idx) => (
                    <div key={r.id || `new-${idx}`} className="admin-card" style={{ padding: '1rem' }}>
                      <div className="ev-form-grid">
                        <div className="ev-input-group">
                          <label className="ev-input-label">
                            <FaCalendarAlt />
                            Date & heure
                          </label>
                          <input
                            type="datetime-local"
                            value={r.scheduled_at}
                            onChange={(e) => updateReminderRow(idx, 'scheduled_at', e.target.value)}
                            className="ev-input"
                          />
                        </div>

                        <div className="ev-input-group">
                          <label className="ev-input-label">Message</label>
                          <input
                            type="text"
                            value={r.message}
                            onChange={(e) => updateReminderRow(idx, 'message', e.target.value)}
                            className="ev-input"
                            placeholder="Optionnel"
                          />
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
                        <button type="button" onClick={() => removeReminderRow(idx)} className="admin-btn admin-btn-danger" style={{ height: 40 }}>
                          <FaTrash />
                          Supprimer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Format d'événement */}
            <div className="ev-input-group" style={{ marginTop: '1.5rem' }}>
              <label className="ev-input-label">
                Format de l'événement <span className="required">*</span>
              </label>
              <div className="ev-format-selector">
                {[
                  { type: 'PHYSICAL', label: 'Physique', icon: FaMapMarkerAlt },
                  { type: 'VIRTUAL', label: 'Virtuel', icon: FaVideo },
                  { type: 'HYBRID', label: 'Hybride', icon: FaGlobe }
                ].map(({ type, label, icon: Icon }) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleChange('event_format', type)}
                    className={`ev-format-option ${formData.event_format === type ? 'selected' : ''}`}
                  >
                    <div className="ev-format-option-icon"><Icon /></div>
                    <div className="ev-format-option-label">{label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Lieu (si physique ou hybride) */}
            {(formData.event_format === 'PHYSICAL' || formData.event_format === 'HYBRID') && (
              <div style={{ marginTop: '1.5rem' }}>
                <div className="ev-form-grid">
                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      <FaMapMarkerAlt />
                      Lieu <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => handleChange('location', e.target.value)}
                      className="ev-input"
                      placeholder="Ex: Palais des Congrès de Lomé"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      Adresse
                    </label>
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleChange('address', e.target.value)}
                      className="ev-input"
                      placeholder="Ex: 123 Avenue de la République"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      Ville <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="ev-input"
                      placeholder="Ex: Lomé"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      Pays <span className="required">*</span>
                    </label>
                    <select
                      value={formData.country_code}
                      onChange={(e) => handleChange('country_code', e.target.value)}
                      className="ev-input ev-select"
                      required
                    >
                      <option value="TG">Togo (TG)</option>
                      <option value="SN">Sénégal (SN)</option>
                      <option value="FR">France (FR)</option>
                      <option value="CA">Canada (CA)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Informations en ligne (si virtuel ou hybride) */}
            {(formData.event_format === 'VIRTUAL' || formData.event_format === 'HYBRID') && (
              <div style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '12px', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                <h3 style={{ fontWeight: 700, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FaVideo style={{ color: '#3b82f6' }} />
                  Informations de la réunion virtuelle
                </h3>

                <div className="ev-input-group">
                  <label className="ev-input-label">
                    Plateforme <span className="required">*</span>
                  </label>
                  <select
                    value={formData.virtual_platform}
                    onChange={(e) => handleChange('virtual_platform', e.target.value)}
                    className="ev-input ev-select"
                    required
                  >
                    <option value="zoom">Zoom</option>
                    <option value="google_meet">Google Meet</option>
                    <option value="microsoft_teams">Microsoft Teams</option>
                    <option value="webex">Webex</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="ev-input-group">
                  <label className="ev-input-label">
                    Lien de l'événement en ligne <span className="required">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.virtual_meeting_url}
                    onChange={(e) => handleChange('virtual_meeting_url', e.target.value)}
                    className="ev-input"
                    placeholder="https://zoom.us/j/123456789"
                  />
                </div>

                <div className="ev-form-grid">
                  <div className="ev-input-group">
                    <label className="ev-input-label">ID de la réunion</label>
                    <input
                      type="text"
                      value={formData.virtual_meeting_id}
                      onChange={(e) => handleChange('virtual_meeting_id', e.target.value)}
                      className="ev-input"
                      placeholder="123 456 789"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Mot de passe</label>
                    <input
                      type="text"
                      value={formData.virtual_meeting_password}
                      onChange={(e) => handleChange('virtual_meeting_password', e.target.value)}
                      className="ev-input"
                      placeholder="abc123"
                    />
                  </div>
                </div>

                <div className="ev-input-group">
                  <label className="ev-input-label">Instructions pour rejoindre (optionnel)</label>
                  <textarea
                    value={formData.virtual_instructions}
                    onChange={(e) => handleChange('virtual_instructions', e.target.value)}
                    rows={3}
                    className="ev-input ev-textarea"
                    placeholder="Ex: Connectez-vous 5 minutes avant le début, activez votre caméra..."
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Billets */}
        {currentStep === 3 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 className="ev-form-title" style={{ margin: 0 }}>Billets & Prix</h2>
              <button
                type="button"
                onClick={addTicket}
                className="ev-btn ev-btn-primary"
              >
                <FaPlus />
                Ajouter un billet
              </button>
            </div>

            {/* Type d'événement: Gratuit ou Payant */}
            <div style={{ padding: '1.5rem', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem' }}>
              <label className="ev-input-label" style={{ marginBottom: '1rem' }}>
                Type d'événement <span className="required">*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    const updatedTickets = formData.tickets.map(t => ({ ...t, price: 0 }));
                    setFormData(prev => ({ ...prev, tickets: updatedTickets }));
                  }}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: `2px solid ${formData.tickets.every(t => t.price === 0) ? '#10b981' : '#e2e8f0'}`,
                    background: formData.tickets.every(t => t.price === 0) ? 'rgba(16, 185, 129, 0.1)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, color: formData.tickets.every(t => t.price === 0) ? '#059669' : '#64748b' }}>
                    <FaTicketAlt />
                    <span>Événement Gratuit</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7, color: '#64748b' }}>Tous les billets seront à 0</p>
                </button>

                <button
                  type="button"
                  onClick={() => {}}
                  style={{
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: `2px solid ${formData.tickets.some(t => t.price > 0) ? '#3b82f6' : '#e2e8f0'}`,
                    background: formData.tickets.some(t => t.price > 0) ? 'rgba(59, 130, 246, 0.1)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', fontWeight: 700, color: formData.tickets.some(t => t.price > 0) ? '#2563eb' : '#64748b' }}>
                    <FaTicketAlt />
                    <span>Événement Payant</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.7, color: '#64748b' }}>Définissez les prix ci-dessous</p>
                </button>
              </div>
            </div>

            {formData.tickets.map((ticket, index) => (
              <div key={index} className="ev-ticket-card">
                <div className="ev-ticket-header">
                  <span className="ev-ticket-title">Billet #{index + 1}</span>
                  {formData.tickets.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTicket(index)}
                      className="ev-ticket-remove"
                    >
                      <FaTrash style={{ marginRight: '0.25rem' }} />
                      Supprimer
                    </button>
                  )}
                </div>

                <div className="ev-form-grid">
                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      Nom du billet <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      value={ticket.name}
                      onChange={(e) => handleTicketChange(index, 'name', e.target.value)}
                      className="ev-input"
                      placeholder="Ex: Standard, VIP, Étudiant"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">
                      Prix <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      value={ticket.price}
                      onChange={(e) => handleTicketChange(index, 'price', parseFloat(e.target.value) || 0)}
                      className="ev-input"
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Quantité disponible</label>
                    <input
                      type="number"
                      value={ticket.quantity_available}
                      onChange={(e) => handleTicketChange(index, 'quantity_available', parseInt(e.target.value) || 1)}
                      className="ev-input"
                      min="1"
                    />
                  </div>

                  <div className="ev-input-group">
                    <label className="ev-input-label">Devise</label>
                    <select
                      value={ticket.currency}
                      onChange={(e) => handleTicketChange(index, 'currency', e.target.value)}
                      className="ev-input ev-select"
                    >
                      <option value="USD">USD (Dollar)</option>
                    </select>
                  </div>

                  <div className="ev-form-full ev-input-group">
                    <label className="ev-input-label">Description (optionnel)</label>
                    <textarea
                      value={ticket.description}
                      onChange={(e) => handleTicketChange(index, 'description', e.target.value)}
                      rows={2}
                      className="ev-input ev-textarea"
                      placeholder="Avantages inclus dans ce billet..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* STEP 4: Images */}
        {currentStep === 4 && (
          <div>
            <h2 className="ev-form-title">Images & Médias</h2>

            <div className="ev-input-group">
              <label className="ev-input-label">Image de couverture</label>

              {/* Upload Zone */}
              <label className="ev-upload-zone">
                <div className="ev-upload-icon">
                  <FaImage />
                </div>
                <p className="ev-upload-text">
                  {uploadingImage ? 'Upload en cours...' : 'Cliquez pour sélectionner une image'}
                </p>
                <p className="ev-upload-hint">JPG, PNG, GIF ou WEBP (max 5MB)</p>
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  style={{ display: 'none' }}
                />
              </label>

              {/* URL manuelle */}
              <div style={{ marginTop: '1rem' }}>
                <label className="ev-input-label" style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Ou entrez une URL d'image
                </label>
                <input
                  type="url"
                  value={formData.cover_image_url}
                  onChange={(e) => handleChange('cover_image_url', e.target.value)}
                  className="ev-input"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Preview */}
              {formData.cover_image_url && (
                <div className="ev-upload-preview">
                  <img
                    src={formData.cover_image_url}
                    alt="Preview"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      showError('Impossible de charger l\'image');
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Révision */}
        {currentStep === 5 && (
          <div>
            <h2 className="ev-form-title">Révision & Publication</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="ev-review-section">
                <h3 className="ev-review-title">
                  <FaInfoCircle style={{ color: '#7c3aed' }} />
                  Informations de base
                </h3>
                <div className="ev-review-item">
                  <span className="ev-review-label">Titre :</span>
                  <span className="ev-review-value">{formData.title}</span>
                </div>
                <div className="ev-review-item">
                  <span className="ev-review-label">Catégorie :</span>
                  <span className="ev-review-value">{categories.find(c => c.id === parseInt(formData.category_id))?.name}</span>
                </div>
              </div>

              <div className="ev-review-section">
                <h3 className="ev-review-title">
                  <FaCalendarAlt style={{ color: '#7c3aed' }} />
                  Date & Lieu
                </h3>
                <div className="ev-review-item">
                  <span className="ev-review-label">Date de début :</span>
                  <span className="ev-review-value">{new Date(formData.start_date).toLocaleString('fr-FR')}</span>
                </div>
                <div className="ev-review-item">
                  <span className="ev-review-label">Format :</span>
                  <span className="ev-review-value">{formData.event_format === 'PHYSICAL' ? 'Physique' : formData.event_format === 'VIRTUAL' ? 'Virtuel' : 'Hybride'}</span>
                </div>
                {formData.location && (
                  <div className="ev-review-item">
                    <span className="ev-review-label">Lieu :</span>
                    <span className="ev-review-value">{formData.location}</span>
                  </div>
                )}
                {formData.city && (
                  <div className="ev-review-item">
                    <span className="ev-review-label">Ville :</span>
                    <span className="ev-review-value">{formData.city}</span>
                  </div>
                )}
              </div>

              <div className="ev-review-section">
                <h3 className="ev-review-title">
                  <FaTicketAlt style={{ color: '#7c3aed' }} />
                  Billets
                </h3>
                {formData.tickets.map((ticket, i) => (
                  <div key={i} className="ev-review-item">
                    <span className="ev-review-label">{ticket.name} :</span>
                    <span className="ev-review-value">{ticket.price} {ticket.currency} ({ticket.quantity_available} places)</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
              {isEditMode ? (
                <button
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                  className="ev-btn ev-btn-primary ev-btn-lg"
                  style={{ flex: 1 }}
                >
                  <FaSave />
                  Enregistrer les modifications
                </button>
              ) : (
                <>
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="ev-btn ev-btn-secondary ev-btn-lg"
                    style={{ flex: 1 }}
                  >
                    <FaSave />
                    Sauvegarder en brouillon
                  </button>

                  <button
                    onClick={() => handleSubmit(true)}
                    disabled={loading}
                    className="ev-btn ev-btn-primary ev-btn-lg"
                    style={{ flex: 1 }}
                  >
                    <FaCheckCircle />
                    Publier l'événement
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        {currentStep < 5 && (
          <div className="ev-form-nav">
            <button
              onClick={prevStep}
              disabled={currentStep === 1}
              className="ev-btn ev-btn-secondary"
              style={{ opacity: currentStep === 1 ? 0.5 : 1 }}
            >
              <FaArrowLeft />
              Précédent
            </button>

            <button
              onClick={nextStep}
              className="ev-btn ev-btn-primary"
            >
              Suivant
              <FaArrowRight />
            </button>
          </div>
        )}

        {currentStep === 5 && (
          <button
            onClick={prevStep}
            className="ev-btn ev-btn-secondary"
            style={{ marginTop: '1rem' }}
          >
            <FaArrowLeft />
            Retour
          </button>
        )}
      </div>
        </>
      )}
    </LayoutAdmin>
  );
}

export default CreateEvent;
