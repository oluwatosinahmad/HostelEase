import db from '../server/db.js';

console.log('--- PROPERTIES ---');
const props = db.prepare('SELECT id, title, availability_status FROM properties LIMIT 10').all();
console.table(props);

console.log('--- BOOKINGS ---');
const books = db.prepare('SELECT id, property_id, room_id, status FROM bookings').all();
console.table(books);

console.log('--- ROOMS ---');
const rooms = db.prepare('SELECT id, property_id, room_name, quantity_total, quantity_available FROM rooms LIMIT 10').all();
console.table(rooms);
