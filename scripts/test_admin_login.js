const res = await fetch('http://localhost:5000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'admin@hostelease.ng',
    password: 'Admin123!',
    role: 'ADMIN'
  })
});

const data = await res.json();
console.log('Login Status:', res.status);
console.log('Login Response:', JSON.stringify(data, null, 2));
