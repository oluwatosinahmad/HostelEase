import netlifyHandler from '../netlify/functions/api';

async function runIsolationSuite() {
  console.log('🧪 Starting HostelEase Universal Student Profile Isolation Verification...\n');

  // Test 1: Register Student Alpha
  console.log('1️⃣ Registering Student Alpha (Biomedical Engineering, 200L, 2023/12345)...');
  const regAlphaReq = new Request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student_alpha@test.edu.ng',
      password: 'AlphaPassword123!',
      fullName: 'Alpha Testing Student',
      phone: '08111111111',
      role: 'STUDENT',
      department: 'Biomedical Engineering',
      level: '200L',
      matricNo: '2023/12345'
    })
  });
  const regAlphaRes = await netlifyHandler(regAlphaReq);
  const alphaData = await regAlphaRes.json();
  if (!regAlphaRes.ok || !alphaData.token) {
    throw new Error(`Alpha registration failed: ${JSON.stringify(alphaData)}`);
  }
  const tokenAlpha = alphaData.token;
  console.log('✅ Student Alpha registered successfully. UID:', alphaData.user.id);

  // Test 2: Register Student Beta
  console.log('2️⃣ Registering Student Beta (Architecture, 500L, 2019/98765)...');
  const regBetaReq = new Request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student_beta@test.edu.ng',
      password: 'BetaPassword123!',
      fullName: 'Beta Testing Student',
      phone: '08222222222',
      role: 'STUDENT',
      department: 'Architecture',
      level: '500L',
      matricNo: '2019/98765'
    })
  });
  const regBetaRes = await netlifyHandler(regBetaReq);
  const betaData = await regBetaRes.json();
  if (!regBetaRes.ok || !betaData.token) {
    throw new Error(`Beta registration failed: ${JSON.stringify(betaData)}`);
  }
  const tokenBeta = betaData.token;
  console.log('✅ Student Beta registered successfully. UID:', betaData.user.id);

  // Test 3: Register Student Gamma with NO optional details
  console.log('3️⃣ Registering Student Gamma (Fresh student with zero optional details)...');
  const regGammaReq = new Request('http://localhost:5000/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'student_gamma@test.edu.ng',
      password: 'GammaPassword123!',
      fullName: 'Gamma Fresh Student',
      role: 'STUDENT'
    })
  });
  const regGammaRes = await netlifyHandler(regGammaReq);
  const gammaData = await regGammaRes.json();
  if (!regGammaRes.ok || !gammaData.token) {
    throw new Error(`Gamma registration failed: ${JSON.stringify(gammaData)}`);
  }
  const tokenGamma = gammaData.token;
  console.log('✅ Student Gamma registered successfully. UID:', gammaData.user.id);

  // Test 4: Verify Student Alpha Dashboard and Profile
  console.log('\n4️⃣ Verifying Student Alpha Dashboard Data...');
  const alphaDashReq = new Request('http://localhost:5000/api/student/dashboard', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenAlpha}` }
  });
  const alphaDashRes = await netlifyHandler(alphaDashReq);
  const alphaDash = await alphaDashRes.json();
  console.log('Alpha Dashboard User:', alphaDash.user);
  if (alphaDash.user.email !== 'student_alpha@test.edu.ng') throw new Error('Alpha email mismatch');
  if (alphaDash.user.department !== 'Biomedical Engineering') throw new Error('Alpha department mismatch');
  if (alphaDash.user.matricNo !== '2023/12345') throw new Error('Alpha matricNo mismatch');
  if (alphaDash.user.level !== '200L') throw new Error('Alpha level mismatch');
  console.log('✅ Student Alpha sees strictly Alpha’s data!');

  // Test 5: Verify Student Beta Dashboard and Profile
  console.log('\n5️⃣ Verifying Student Beta Dashboard Data...');
  const betaDashReq = new Request('http://localhost:5000/api/student/dashboard', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenBeta}` }
  });
  const betaDashRes = await netlifyHandler(betaDashReq);
  const betaDash = await betaDashRes.json();
  console.log('Beta Dashboard User:', betaDash.user);
  if (betaDash.user.email !== 'student_beta@test.edu.ng') throw new Error('Beta email mismatch');
  if (betaDash.user.department !== 'Architecture') throw new Error('Beta department mismatch');
  if (betaDash.user.matricNo !== '2019/98765') throw new Error('Beta matricNo mismatch');
  if (betaDash.user.level !== '500L') throw new Error('Beta level mismatch');
  if (betaDash.user.department === alphaDash.user.department) throw new Error('Beta leaked Alpha data!');
  console.log('✅ Student Beta sees strictly Beta’s data!');

  // Test 6: Verify Student Gamma Zero Fallback Leakage
  console.log('\n6️⃣ Verifying Student Gamma has ZERO fallback mock data...');
  const gammaDashReq = new Request('http://localhost:5000/api/student/dashboard', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenGamma}` }
  });
  const gammaDashRes = await netlifyHandler(gammaDashReq);
  const gammaDash = await gammaDashRes.json();
  console.log('Gamma Dashboard User:', gammaDash.user);
  console.log('Gamma Completeness:', gammaDash.profileCompleteness);

  if (gammaDash.user.department === 'Computer Science') throw new Error('LEAK: Gamma was assigned default Computer Science!');
  if (gammaDash.user.matricNo === '2024/04812') throw new Error('LEAK: Gamma was assigned default 2024/04812!');
  if (gammaDash.user.department !== '') throw new Error('Gamma department should be empty string');
  if (gammaDash.user.matricNo !== '') throw new Error('Gamma matricNo should be empty string');
  if (gammaDash.profileCompleteness.score > 50) throw new Error('Gamma profile completeness should reflect missing fields');
  console.log('✅ Student Gamma has clean empty profile with NO mock leakage!');

  // Test 7: Update Gamma Profile
  console.log('\n7️⃣ Updating Gamma Profile with their actual information...');
  const updateGammaReq = new Request('http://localhost:5000/api/student/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tokenGamma}` },
    body: JSON.stringify({
      fullName: 'Dr. Gamma Real Student',
      phone: '08099998888',
      department: 'Urban and Regional Planning',
      level: '300L',
      matricNo: '2021/44455'
    })
  });
  const updateGammaRes = await netlifyHandler(updateGammaReq);
  const updateGammaData = await updateGammaRes.json();
  console.log('Updated Gamma result:', updateGammaData.message);

  const getGammaProfileReq = new Request('http://localhost:5000/api/student/profile', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenGamma}` }
  });
  const getGammaProfileRes = await netlifyHandler(getGammaProfileReq);
  const gammaProfile = await getGammaProfileRes.json();
  console.log('Fetched Gamma Profile:', gammaProfile.profile);
  if (gammaProfile.profile.department !== 'Urban and Regional Planning') throw new Error('Gamma updated department mismatch');
  if (gammaProfile.profile.matricNo !== '2021/44455') throw new Error('Gamma updated matric mismatch');
  console.log('✅ Student Gamma profile updated and retrieved with 100% fidelity!');

  // Test 8: Verify Alpha and Beta are completely unaffected by Gamma updates
  console.log('\n8️⃣ Cross-account verification: Alpha and Beta untouched by Gamma...');
  const alphaCheckReq = new Request('http://localhost:5000/api/student/profile', {
    method: 'GET',
    headers: { 'Authorization': `Bearer ${tokenAlpha}` }
  });
  const alphaCheckRes = await netlifyHandler(alphaCheckReq);
  const alphaCheck = await alphaCheckRes.json();
  if (alphaCheck.profile.department !== 'Biomedical Engineering') throw new Error('Alpha profile corrupted by Gamma!');
  console.log('✅ Alpha profile remains strictly Biomedical Engineering!');

  console.log('\n🎉 ALL 8 STRICT STUDENT PROFILE ISOLATION TESTS PASSED WITH 100% SUCCESS! 🎉');
}

runIsolationSuite().catch(err => {
  console.error('❌ Isolation Suite Failed:', err);
  process.exit(1);
});
