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