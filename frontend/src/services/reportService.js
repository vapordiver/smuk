import api from './api';

/* ── Mock / fallback data ── */

const MOCK_CATEGORIES = [
  { id: 1, name: 'mock', icon: '💧', color: '#2196F3' },
  { id: 2, name: 'nie wczytalo sie', icon: '⚡', color: '#FFEB3B' },
  { id: 3, name: 'pozdrawiam', icon: '🔥', color: '#FF5722' },
];

const MOCK_BUILDINGS = [
  { id: 1, name: 'mock', centroid: { type: 'Point', coordinates: [19.9123, 50.0654] } },
  { id: 2, name: 'pozdrawiam', centroid: { type: 'Point', coordinates: [19.9150, 50.0630] } },
];

/* ── Helpers ── */

/**
 * Quick fetch with a short timeout (2s). If backend is unreachable,
 * fails fast instead of hanging for 10s on the proxy.
 */
async function quickFetch(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2000);

  try {
    const { data } = await api.get(url, { signal: controller.signal });
    return data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/* ── Service functions ── */

/**
 * Fetch fault categories from backend, falling back to mock data.
 */
export async function fetchCategories() {
  try {
    const data = await quickFetch('categories/');
    if (Array.isArray(data) && data.length > 0) return data;
    throw new Error('Empty response');
  } catch (err) {
    console.warn('[reportService] GET /api/categories/ failed — using mock data:', err.message);
    return MOCK_CATEGORIES;
  }
}

/**
 * Fetch campus buildings from backend, falling back to mock data.
 */
export async function fetchBuildings() {
  try {
    const data = await quickFetch('buildings/');
    if (Array.isArray(data) && data.length > 0) {
      // Natural alphanumeric sort (A-1, A-2, A-10)
      return data.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
      );
    }
    throw new Error('Empty response');
  } catch (err) {
    console.warn('[reportService] GET /api/buildings/ failed — using mock data:', err.message);
    return MOCK_BUILDINGS.sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
    );
  }
}

/**
 * Submit a new ticket. Currently MOCKED (returns fake response after 1.5s delay).
 * Will be replaced with real POST /api/tickets/ in SMUK-13.
 *
 * @param {FormData} formData - multipart/form-data with ticket fields + image
 * @returns {Promise<object>} mock TicketDetail
 */
export async function submitTicket(formData) {
  // ── MOCK implementation ──
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Simulate random failure (10% chance) for testing error states
  if (Math.random() < 0.1) {
    const error = new Error('Symulowany błąd serwera');
    error.response = {
      status: 500,
      data: {
        error: {
          code: 'SERVER_ERROR',
          message: 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.',
        },
      },
    };
    throw error;
  }

  return {
    id: Math.floor(Math.random() * 9000) + 1000,
    title: formData.get('title'),
    description: formData.get('description'),
    status: 'NEW',
    priority: 'MEDIUM',
    category: { id: Number(formData.get('category_id')), name: 'Kategoria' },
    building: formData.get('building_id')
      ? { id: Number(formData.get('building_id')), name: 'Budynek' }
      : null,
    floor: formData.get('floor') || null,
    room: formData.get('room') || null,
    location: {
      type: 'Point',
      coordinates: [
        Number(formData.get('longitude')),
        Number(formData.get('latitude')),
      ],
    },
    image: 'tickets/mock/photo.webp',
    reporter: { id: 'mock-uuid', first_name: 'Jan', last_name: 'Kowalski' },
    assigned_to: null,
    parent_ticket: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    audit_log: [],
  };

  // ── Real implementation (SMUK-13) ──
  // const { data } = await api.post('/tickets/', formData, {
  //   headers: { 'Content-Type': 'multipart/form-data' },
  // });
  // return data;
}
