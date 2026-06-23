import {openDB} from 'idb';

export async function initDB() {
    return openDB('smuk-db', 1, {
        upgrade(db) {
            if (!db.objectStoreNames.contains('pending-tickets')) {
                db.createObjectStore('pending-tickets', {keyPath: 'id'});
            }
        },
    });
}

export async function savePendingTicket(ticket) {
    const db = await initDB();
    return db.put('pending-tickets', ticket);
}

export async function getPendingTickets() {
    const db = await initDB();
    return db.getAll('pending-tickets');
}

export async function deletePendingTicket(id) {
    const db = await initDB();
    return db.delete('pending-tickets', id);
}

//atomically read + delete ticket in one transaction (prevents duplicate sends)
export async function claimPendingTicket(id) {
    const db = await initDB();
    const tx = db.transaction('pending-tickets', 'readwrite');
    const store = tx.objectStore('pending-tickets');
    const ticket = await store.get(id);
    if (ticket) {
        await store.delete(id);
    }
    await tx.done;
    return ticket || null;
}