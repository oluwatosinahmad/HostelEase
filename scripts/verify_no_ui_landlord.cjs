const fs = require('fs');
const path = require('path');

function scan(dir) {
  const list = [];
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (['node_modules', '.git', 'dist', 'build'].includes(f)) continue;
    if (fs.statSync(p).isDirectory()) {
      list.push(...scan(p));
    } else if (/\.(tsx|ts|jsx|js|html)$/.test(f)) {
      list.push(p);
    }
  }
  return list;
}

const files = scan(path.join(__dirname, '..', 'src'));
const suspicious = [];

// Whitelist patterns that are purely code/type/DB tokens
const codeTokens = [
  'landlord@hostelease.ng',
  "'LANDLORD'",
  '"LANDLORD"',
  "'landlord'",
  '"landlord"',
  'landlordId',
  'landlordName',
  'landlordPhone',
  'landlordWhatsapp',
  'landlordAmount',
  'landlordPayout',
  'landlordFee',
  'LandlordUser',
  'LandlordReport',
  'LandlordNotification',
  'LandlordPayout',
  'LandlordExperience',
  'landlordExperience',
  'landlordResponse',
  'landlordNote',
  'landlordProfileReviewed',
  'landlordContactReviewed',
  'landlordIdentityReviewed',
  'landlordIdVerified',
  'INITIAL_LANDLORD',
  'allowNewLandlordSignups',
  'campusnest_landlord',
  'AILandlordAssistantModal',
  'AILandlordAssistantModalProps',
  'DEFAULT_LANDLORD_SUGGESTIONS',
  'PIDGIN_LANDLORD_SUGGESTIONS',
  'LandlordAIMessage',
  'LandlordMarketingSection',
  'LandlordPortal',
  'LandlordProfileModal',
  'LandlordReviewResponseModal',
  'ReportLandlordModal',
  'PRESET_LANDLORD_AVATARS',
  'navigateLandlordTab',
  'contactLandlord',
  'verifyLandlordBankAccount',
  'getByLandlordId',
  'getLandlords',
  'updateLandlordVerification',
  'createLandlordReport',
  'getLandlordReports',
  'isDemoLandlord',
  'currentLandlordId',
  'landlordMenuItems',
  'onOpenLandlordReportModal',
  'onOpenLandlordProfile',
  'onOpenLandlordResponse',
  'landlordPhotoInputRef',
  'PRO_LANDLORD',
  'categoryAverages.landlord',
  '{{landlord_name}}',
  'LandlordReviewResponse',
  'LandlordVerificationStatus',
  'LandlordAuthorizationType'
];

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!/landlord/i.test(trimmed)) return;
    
    // Ignore pure comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;
    
    // Check if line contains landlord outside of code tokens
    let testLine = trimmed;
    for (const token of codeTokens) {
      testLine = testLine.split(token).join(' ');
    }

    if (/landlord/i.test(testLine)) {
      suspicious.push({
        file: path.relative(path.join(__dirname, '..'), file),
        line: idx + 1,
        text: trimmed,
        remaining: testLine.trim()
      });
    }
  });
}

console.log(`\nScan finished. Total suspicious occurrences found: ${suspicious.length}`);
suspicious.forEach(s => {
  console.log(`\n[${s.file}:${s.line}]`);
  console.log(`  Actual: ${s.text}`);
  console.log(`  Remainder: ${s.remaining}`);
});
