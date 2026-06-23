//Service Worker
import { precacheAndRoute } from 'workbox-precaching';
import { openDB } from 'idb';

// precache resources from vite
precacheAndRoute(self.__WB_MANIFEST || []);

// listening background sync api (for android chrome)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tickets') {
    event.waitUntil(syncTickets());
  }
});

async function syncTickets() {
  const db = await openDB('smuk-db', 1);
  const tickets = await db.getAll('pending-tickets');

  if (tickets.length === 0) return;

  let successCount = 0;

  for (const ticket of tickets) {
    const formData = new FormData();
    formData.append('title', ticket.title);
    formData.append('category_id', ticket.categoryId);
    if (ticket.buildingId){
        formData.append('building_id', ticket.buildingId);
    }
    formData.append('description', ticket.description);
    formData.append('latitude', ticket.latitude);
    formData.append('longitude', ticket.longitude);
    formData.append('image', ticket.image); // blob img

    try {
      const res = await fetch('/api/tickets/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ticket.token}`
        },
        body: formData
      });

      //delete only if success, validation error or error in function logic / web error doesnt delete from 'queue'
      if (res.ok || (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429)) {
        await db.delete('pending-tickets', ticket.id);
        if (res.ok) successCount++;
      }
    } catch (err) {
      console.error('Background sync error for the ticket: ', ticket.id, err);
      //cancel and leave ticket in IndexedDB till next sync.
      throw err;
    }
  }

//notification, after restored connection
  if (successCount > 0) {
    const clients = await self.clients.matchAll();
    for (const client of clients) {
      client.postMessage({
        type: 'SYNC_SUCCESS',
        count: successCount
      });
    }
  }
}