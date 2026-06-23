//Service Worker
import {precacheAndRoute} from 'workbox-precaching';
import {openDB} from 'idb';

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
        // double-check if ticket still exists (prevent race with main app thread)
        const exists = await db.get('pending-tickets', ticket.id);
        if (!exists) continue;

        const formData = new FormData();
        formData.append('title', ticket.title);
        formData.append('category_id', ticket.categoryId);
        if (ticket.buildingId) {
            formData.append('building_id', ticket.buildingId);
        }
        formData.append('description', ticket.description);
        formData.append('latitude', ticket.latitude);
        formData.append('longitude', ticket.longitude);

        // convert base64 image back to blob (fetch handles data-urls easily)
        let imageBlob;
        try {
            if (typeof ticket.image === 'string' && ticket.image.startsWith('data:image')) {
                const res = await fetch(ticket.image);
                imageBlob = await res.blob();
            } else {
                imageBlob = ticket.image;
            }
        } catch (blobErr) {
            console.error('Failed to convert base64 to blob in SW:', blobErr);
            // remove corrupt ticket from queue to prevent infinite background sync loops
            await db.delete('pending-tickets', ticket.id);
            continue;
        }

        formData.append('image', imageBlob, 'offline-image.jpg');

        try {
            const res = await fetch('/api/tickets/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${ticket.token}`
                },
                body: formData
            });
            if (res.ok) {
                await db.delete('pending-tickets', ticket.id);
                successCount++;
            } else if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
                //validation error
                await db.delete('pending-tickets', ticket.id);
            } else {
                //no retry storming in case of error 5xx, 401 or 429.
                break;
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