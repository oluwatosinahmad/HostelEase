async function testUploadEndpoint() {
  // 1. Log in as Provider
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'provider@hostelease.ng', password: 'Provider123!' })
  });
  const { token } = await loginRes.json();

  // 2. Create sample image file
  const imgBlob = new Blob(['sample-fake-jpeg-bytes'], { type: 'image/jpeg' });
  const formData = new FormData();
  formData.append('file', imgBlob, 'sample_bedroom.jpg');

  const upRes = await fetch('http://localhost:5000/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData
  });

  const upData = await upRes.json();
  console.log('Single Photo Upload Status:', upRes.status);
  console.log('Single Photo Upload Response:', upData);

  // 3. Create sample video file
  const videoBlob = new Blob(['sample-fake-mp4-video-bytes'], { type: 'video/mp4' });
  const videoFormData = new FormData();
  videoFormData.append('file', videoBlob, 'room_walkthrough_tour.mp4');

  const videoUpRes = await fetch('http://localhost:5000/api/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: videoFormData
  });

  const videoUpData = await videoUpRes.json();
  console.log('Video Tour Upload Status:', videoUpRes.status);
  console.log('Video Tour Upload Response:', videoUpData);
}

testUploadEndpoint();
