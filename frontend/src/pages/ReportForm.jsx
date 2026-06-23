import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useSubmitTicket from '../hooks/useSubmitTicket';
import useCategories from '../hooks/useCategories';
import useBuildings from '../hooks/useBuildings';
import CameraCapture from '../components/report/CameraCapture';
import LocationPicker from '../components/report/LocationPicker';
import Toast, { useToast } from '../components/common/Toast';
import DuplicateModal from '../components/report/DuplicateModal';
import api from '../services/api';
import {savePendingTicket} from "../services/db.js";

/**
 * ReportForm — Full responsive fault-report form (mobile-first).
 * Follows the Indigo Scholar Design System.
 */
export default function ReportForm() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();
  const { submitTicket, submitting } = useSubmitTicket();

  /* ── Dictionary data ── */
  const { categories, loading: categoriesLoading, error: categoriesError } = useCategories();
  const { buildings, loading: buildingsLoading, error: buildingsError } = useBuildings();
  const loadingData = categoriesLoading || buildingsLoading;

  useEffect(() => {
    if (categoriesError || buildingsError) {
      showToast('error', 'Nie udało się załadować danych formularza.');
    }
  }, [categoriesError, buildingsError, showToast]);

  /* ── Form fields ── */
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);

  /* ── Form state ── */
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);


  const [isMobile, setIsMobile] = useState(true);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [nearbyTickets, setNearbyTickets] = useState([]);
  const [isPrechecking, setIsPrechecking] = useState(false);

  /* ── Mobile Check ── */
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const hasTouch = (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
      const isMobileWidth = window.innerWidth <= 1024;

      setIsMobile(isMobileRegex || (hasTouch && isMobileWidth));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  /* ── Load dictionary data ── */
  // Loading is handled internally by useCategories and useBuildings hooks

  /* ── Validation ── */
  const validate = () => {
    const errs = {};

    if (!title.trim() || title.trim().length < 5) {
      errs.title = 'Tytuł musi mieć co najmniej 5 znaków.';
    }
    if (!categoryId) {
      errs.categoryId = 'Wybierz kategorię usterki.';
    }
    if (!description.trim() || description.trim().length < 10) {
      errs.description = 'Opis musi mieć co najmniej 10 znaków.';
    }
    if (!image) {
      errs.image = 'Zdjęcie jest wymagane.';
    }
    if (!location) {
      errs.location = 'Lokalizacja GPS jest wymagana.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Submit (FOR DUPLICATE) ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showToast('error', 'Formularz zawiera błędy. Popraw zaznaczone pola.');
      const firstErrorEl = document.querySelector('[data-field-error]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setIsPrechecking(true);
    // PRE-CHECK FOR DUPLICATES
    try {
      const res = await api.get('/tickets/nearby/', {
        params: {
          lat: location.lat,
          lng: location.lng,
          category_id: categoryId,
          radius: 50, // promien w metrach
          building_id: buildingId || ''
        }
      });
      if (res.data.results && res.data.results.length > 0) {
        setNearbyTickets(res.data.results);
        setShowDuplicateModal(true);
        setIsPrechecking(false);
        return; //stop to show duplicate modal
      }
      //if no duplicates
      await executeNormalSubmit();
    } catch (err) {
      console.warn("Błąd pre-checku duplikatów:", err);
      await executeNormalSubmit();
    }
  };


  /* ── Submit ── */
  const executeNormalSubmit = async () => {
    setIsPrechecking(false);
    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category_id', categoryId);
      if (buildingId) formData.append('building_id', buildingId);
      formData.append('description', description.trim());
      formData.append('image', image);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);

      //standard submit try
      await submitTicket(formData);

      setSubmitted(true);
      showToast('success', 'Zgłoszenie zostało wysłane! Przekierowuję…');
      setTimeout(() => navigate('/my-tickets'), 2000);
    } catch (err) {
        //if offline
        if(!navigator.onLine || err.message === 'Network Error' || err.code === 'ERR_NETWORK'){
            try{
                const pendingTicket = {
                    id: Date.now().toString(), //a unique id for cache db
                    title: title.trim(),
                    categoryId: categoryId,
                    buildingId: buildingId || null,
                    description: description.trim(),
                    latitude: location.lat,
                    longitude: location.lng,
                    image: image,
                    token: localStorage.getItem('accessToken')
                };
                await savePendingTicket(pendingTicket);
                //background sync for android
                if('serviceWorker' in navigator && 'SyncManager' in window){
                    const registration = await navigator.serviceWorker.ready;
                    await registration.sync.register('sync-tickets');
                }
                setSubmitted(true);
                showToast('success', 'Brak internetu. Zgłoszenie zapisane offline. Zostanie wysłane po odzyskaniu połączenia.');
                setTimeout(()=> navigate('/my-tickets'),3000);
            }catch (dbError){
                console.error("Error while saving ticket to IndexedDB",dbError);
                showToast('error','Nie udało się zapisać zgłoszenia w trybie offline.');
            }
            return;
        }
      const locationErrors = [
        'Lokalizacja znajduje się poza granicami kampusu.',
        'Lokalizacja jest zbyt daleko od wybranego budynku (maks. 300m).',
      ];
      if (locationErrors.includes(err.message)) setLocation(null);
      showToast('error', err.message);
    }
  };

  /* ── Confirm Duplicate ── */
  const handleConfirmDuplicate = async (parentTicketId) => {
    try {
      const payload = {
        new_ticket_data: {
          title: title.trim(),
          description: description.trim(),
          category_id: categoryId,
          latitude: location.lat,
          longitude: location.lng
        }
      };

      await api.post(`/tickets/${parentTicketId}/confirm-duplicate/`, payload);

      setShowDuplicateModal(false);
      showToast('success', 'Zgłoszenie podpięte. Przekierowuję…');
      setTimeout(() => navigate('/my-tickets'), 2000);
    } catch (err) {
      showToast('error', 'Wystąpił błąd podczas podpinania zgłoszenia.');
    }
  };

  /* ── Reject Duplicate ── */
  const handleRejectDuplicate = () => {
    setShowDuplicateModal(false);
    executeNormalSubmit();
  };

  /* ── Skeleton loader for selects ── */
  const SelectSkeleton = () => (
    <div className="h-12 rounded-xl bg-surface-container animate-pulse" />
  );

  /* ── Desktop Block Screen ── */
  if (!isMobile) {
    return (
      <main className="flex-1 overflow-y-auto scrollbar-thin bg-surface-container-low flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-surface p-10 rounded-[32px] shadow-xl flex flex-col items-center text-center border border-outline-variant">
          <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              smartphone
            </span>
          </div>
          <h1 className="text-2xl font-bold text-on-background mb-4">Tylko dla urządzeń mobilnych</h1>
          <p className="text-on-surface-variant mb-10 text-sm leading-relaxed">
            Formularz zgłaszania usterek wymaga dostępu do aparatu oraz dokładnej lokalizacji GPS. Aby ułatwić i zautomatyzować ten proces, funkcja ta jest dostępna wyłącznie na smartfonach i tabletach.
          </p>
          <Link
            to="/"
            className="h-14 px-8 rounded-xl bg-primary text-on-primary font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[0.98] transition-all flex items-center justify-center gap-2 w-full"
          >
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
            Wróć do strony głównej
          </Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <Toast {...toast} />
        {/* ── Duplicate Modal ── */}
        {showDuplicateModal && (
        <DuplicateModal
          tickets={nearbyTickets}
          onConfirm={handleConfirmDuplicate}
          onReject={handleRejectDuplicate}
          onClose={() => setShowDuplicateModal(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto scrollbar-thin">
        {/* ── Sticky header ── */}
        <div className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md border-b border-outline px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link
            to="/"
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors"
            aria-label="Powrót"
          >
            <span className="material-symbols-outlined text-xl text-on-surface-variant">arrow_back</span>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-on-background leading-tight">Zgłoś usterkę</h1>
            <p className="text-xs text-on-surface-variant">Wypełnij formularz poniżej</p>
          </div>
        </div>

        {/* ── Form ── */}
        <form
          onSubmit={handleSubmit}
          noValidate
          className="max-w-2xl mx-auto px-4 sm:px-6 py-6 pb-32 space-y-5"
        >
          {/* ── Camera ── */}
          <CameraCapture
            value={image}
            onChange={(file) => {
              setImage(file);
              if (file) setErrors((prev) => ({ ...prev, image: undefined }));
            }}
            error={errors.image}
          />

          {/* ── Title ── */}
          <div data-field-error={errors.title ? '' : undefined}>
            <label htmlFor="report-title" className="block text-sm font-semibold text-on-background mb-1.5">
              Tytuł zgłoszenia <span className="text-error">*</span>
              <span className="text-on-surface-variant font-normal text-xs ml-1">(min. 5 znaków)</span>
            </label>
            <input
              id="report-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.trim().length >= 5) setErrors((prev) => ({ ...prev, title: undefined }));
              }}
              placeholder="np. Pęknięta rura w łazience"
              disabled={submitting}
              className={`w-full h-12 px-4 rounded-xl bg-surface-container-low border-2 text-sm text-on-background placeholder:text-on-surface-variant/50
                focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all
                ${errors.title ? 'border-error' : 'border-outline hover:border-outline-variant'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.title && (
              <p className="text-xs text-error flex items-start gap-1 mt-1">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
                <span className="flex-1">{errors.title}</span>
              </p>
            )}
          </div>

          {/* ── Category ── */}
          <div data-field-error={errors.categoryId ? '' : undefined}>
            <label htmlFor="report-category" className="block text-sm font-semibold text-on-background mb-1.5">
              Kategoria usterki <span className="text-error">*</span>
            </label>
            {loadingData ? (
              <SelectSkeleton />
            ) : (
              <>
                <div className="relative">
                  <select
                    id="report-category"
                    value={categoryId}
                    onChange={(e) => {
                      setCategoryId(e.target.value);
                      if (e.target.value) setErrors((prev) => ({ ...prev, categoryId: undefined }));
                    }}
                    disabled={submitting}
                    className={`w-full h-12 px-4 pr-10 rounded-xl bg-surface-container-low border-2 text-sm text-on-background appearance-none cursor-pointer
                      focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all
                      ${errors.categoryId ? 'border-error' : 'border-outline hover:border-outline-variant'}
                      disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <option value="">Wybierz kategorię…</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </option>
                    ))}
                  </select>
                  <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">
                    expand_more
                  </span>
                </div>
              </>
            )}
            {errors.categoryId && (
              <p className="text-xs text-error flex items-start gap-1 mt-1">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
                <span className="flex-1">{errors.categoryId}</span>
              </p>
            )}
          </div>

          {/* ── Building ── */}
          <div>
            <label htmlFor="report-building" className="block text-sm font-semibold text-on-background mb-1.5">
              Budynek
              <span className="text-on-surface-variant font-normal text-xs ml-1">(opcjonalnie)</span>
            </label>
            {loadingData ? (
              <SelectSkeleton />
            ) : (
              <div className="relative">
                <select
                  id="report-building"
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  disabled={submitting}
                  className={`w-full h-12 px-4 pr-10 rounded-xl bg-surface-container-low border-2 text-sm text-on-background appearance-none cursor-pointer
                    focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all
                    border-outline hover:border-outline-variant
                    disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <option value="">Wybierz budynek…</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none text-lg">
                  expand_more
                </span>
              </div>
            )}
          </div>



          {/* ── Description ── */}
          <div data-field-error={errors.description ? '' : undefined}>
            <label htmlFor="report-description" className="block text-sm font-semibold text-on-background mb-1.5">
              Opis usterki <span className="text-error">*</span>
              <span className="text-on-surface-variant font-normal text-xs ml-1">(min. 10 znaków)</span>
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim().length >= 10) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              rows={4}
              placeholder="Opisz problem szczegółowo…"
              disabled={submitting}
              className={`w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 text-sm text-on-background placeholder:text-on-surface-variant/50 resize-y min-h-[100px]
                focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all
                ${errors.description ? 'border-error' : 'border-outline hover:border-outline-variant'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.description && (
              <p className="text-xs text-error flex items-start gap-1 mt-1">
                <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">warning</span>
                <span className="flex-1">{errors.description}</span>
              </p>
            )}
          </div>

          {/* ── Location ── */}
          <LocationPicker
            value={location}
            onChange={(loc) => {
              setLocation(loc);
              if (loc) setErrors((prev) => ({ ...prev, location: undefined }));
            }}
            error={errors.location}
          />

          {/* ── Submit button ── */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={submitting || submitted || loadingData || isPrechecking}
              className="w-full h-14 rounded-xl bg-primary text-on-primary font-bold text-base shadow-lg shadow-primary/20
                hover:shadow-xl hover:shadow-primary/30 hover:scale-[0.98] active:scale-95
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg
                flex items-center justify-center gap-2"
            >
              {(submitting || isPrechecking) ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                  Przetwarzanie…
                </>
              ) : submitted ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                  Przekierowuję…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                    send
                  </span>
                  Wyślij zgłoszenie
                </>
              )}
            </button>
          </div>

          {/* ── Info note ── */}
          <p className="text-center text-xs text-on-surface-variant px-4 pb-4">
            Twoje zgłoszenie zostanie przesłane do zespołu konserwacji kampusu.
            Otrzymasz powiadomienie o zmianie statusu.
          </p>
        </form>
      </main>
    </>
  );
}
