import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { fetchCategories, fetchBuildings, submitTicket } from '../services/reportService';
import CameraCapture from '../components/report/CameraCapture';
import LocationPicker from '../components/report/LocationPicker';
import Toast, { useToast } from '../components/common/Toast';

/**
 * ReportForm — Full responsive fault-report form (mobile-first).
 * Follows the Indigo Scholar Design System.
 */
export default function ReportForm() {
  const navigate = useNavigate();
  const { toast, showToast } = useToast();

  /* ── Dictionary data ── */
  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  /* ── Form fields ── */
  const [title, setTitle] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [buildingId, setBuildingId] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [location, setLocation] = useState(null);

  /* ── Form state ── */
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  /* ── Load dictionary data ── */
  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const [cats, bldgs] = await Promise.all([
          fetchCategories(),
          fetchBuildings(),
        ]);
        if (mounted) {
          setCategories(cats);
          setBuildings(bldgs);
        }
      } catch (err) {
        console.error('[ReportForm] Failed to load dictionaries:', err);
        if (mounted) showToast('error', 'Nie udało się załadować danych formularza.');
      } finally {
        if (mounted) setLoadingData(false);
      }
    }
    loadData();
    return () => { mounted = false; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      showToast('error', 'Formularz zawiera błędy. Popraw zaznaczone pola.');
      // Scroll to first error
      const firstErrorEl = document.querySelector('[data-field-error]');
      firstErrorEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('title', title.trim());
      formData.append('category_id', categoryId);
      if (buildingId) formData.append('building_id', buildingId);
      formData.append('description', description.trim());
      formData.append('image', image);
      formData.append('latitude', location.lat);
      formData.append('longitude', location.lng);

      await submitTicket(formData);

      showToast('success', 'Zgłoszenie zostało wysłane! Przekierowuję…');

      setTimeout(() => navigate('/my-tickets'), 2000);
    } catch (err) {
      const message =
        err?.response?.data?.error?.message ||
        'Wystąpił błąd podczas wysyłania zgłoszenia. Spróbuj ponownie.';
      showToast('error', message);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Selected category info ── */
  const selectedCategory = categories.find((c) => String(c.id) === String(categoryId));

  /* ── Skeleton loader for selects ── */
  const SelectSkeleton = () => (
    <div className="h-12 rounded-xl bg-surface-container animate-pulse" />
  );

  return (
    <>
      <Toast {...toast} />

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
              <p className="text-xs text-error flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                {errors.title}
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
                {selectedCategory && (
                  <div className="flex items-center gap-2 mt-2 px-1">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    <span className="text-xs text-on-surface-variant">
                      {selectedCategory.icon} {selectedCategory.name}
                    </span>
                  </div>
                )}
              </>
            )}
            {errors.categoryId && (
              <p className="text-xs text-error flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                {errors.categoryId}
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
            </label>
            <textarea
              id="report-description"
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value.trim().length >= 10) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              rows={4}
              placeholder="Opisz problem szczegółowo (min. 10 znaków)…"
              disabled={submitting}
              className={`w-full px-4 py-3 rounded-xl bg-surface-container-low border-2 text-sm text-on-background placeholder:text-on-surface-variant/50 resize-y min-h-[100px]
                focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all
                ${errors.description ? 'border-error' : 'border-outline hover:border-outline-variant'}
                disabled:opacity-50 disabled:cursor-not-allowed`}
            />
            {errors.description ? (
              <p className="text-xs text-error flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">warning</span>
                {errors.description}
              </p>
            ) : description.trim().length > 0 && description.trim().length < 10 ? (
              <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm">edit_note</span>
                Jeszcze {10 - description.trim().length} {10 - description.trim().length === 1 ? 'znak' : 'znaki/znaków'}…
              </p>
            ) : null}
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
              disabled={submitting || loadingData}
              className="w-full h-14 rounded-xl bg-primary text-on-primary font-bold text-base shadow-lg shadow-primary/20
                hover:shadow-xl hover:shadow-primary/30 hover:scale-[0.98] active:scale-95
                transition-all duration-200 cursor-pointer
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg
                flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="material-symbols-outlined text-xl animate-spin">progress_activity</span>
                  Wysyłanie…
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
