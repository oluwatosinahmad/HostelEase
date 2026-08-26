const BASE_URL = 'http://localhost:5000/api';

async function debug() {
  const sRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'student@lautech.edu.ng', password: 'Student123!' })
  });
  const studentToken = (await sRes.json() as any).token;

  const aRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@hostelease.ng', password: 'Admin123!' })
  });
  const adminToken = (await aRes.json() as any).token;

  console.log('--- Debug 1: Smart Match ---');
  const smRes = await fetch(`${BASE_URL}/intelligence/smart-match`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` }
  });
  console.log('Status:', smRes.status);
  console.log('Data:', await smRes.json());

  console.log('\n--- Debug 2: NL Search ---');
  const nlRes = await fetch(`${BASE_URL}/intelligence/nl-search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'I need a hostel close to LAUTECH under ₦200,000 in Under G with good electricity' })
  });
  console.log('Status:', nlRes.status);
  console.log('Data:', await nlRes.json());

  console.log('\n--- Debug 3: Admin Supply-Demand ---');
  const admRes = await fetch(`${BASE_URL}/intelligence/admin/supply-demand`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('Status:', admRes.status);
  console.log('Data:', await admRes.json());
}

debug();
