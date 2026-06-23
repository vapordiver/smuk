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
        // claim ticket atomically: read + delete in one transaction (prevents duplicate sends)
        const tx = db.transaction('pending-tickets', 'readwrite');
        const store = tx.objectStore('pending-tickets');
        const exists = await store.get(ticket.id);
        if (!exists) {
            await tx.done;
            continue;
        }
        await store.delete(ticket.id);
        await tx.done;

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
            //ticket already deleted before send, corrupt blob = skip permanently
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
                //ticket already deleted before send, just count
                successCount++;
            } else if (res.status >= 400 && res.status < 500 && res.status !== 401 && res.status !== 429) {
                //validation error, ticket already deleted, no restore needed
            } else {
                //re-queue ticket for retry on 5xx, 401 or 429
                await db.put('pending-tickets', ticket);
                break;
            }
        } catch (err) {
            console.error('Background sync error for the ticket: ', ticket.id, err);
            //re-queue ticket for next sync attempt
            await db.put('pending-tickets', ticket);
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