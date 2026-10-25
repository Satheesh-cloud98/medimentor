import fs from 'fs';
import path from 'path';
import { signJwt, verifyJwt } from '../api/auth';

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string, detail?: string) {
  if (condition) {
    passed++;
    console.log(`✅ [PASS] ${desc}${detail ? ` (${detail})` : ''}`);
  } else {
    failed++;
    console.error(`❌ [FAIL] ${desc}${detail ? ` (${detail})` : ''}`);
  }
}

async function runTestSuite() {
  console.log('=== MEDIMENTOR AI: HOMEPAGE & AUTHENTICATION VERIFICATION ===\n');

  // Test 1: Check HomePage.tsx content for exact specified strings
  const homePath = path.resolve('src/pages/HomePage.tsx');
  assert(fs.existsSync(homePath), 'HomePage.tsx exists');
  const homeContent = fs.readFileSync(homePath, 'utf8');

  assert(homeContent.includes('MediMentor'), 'Contains brand name "MediMentor"');
  assert(homeContent.includes('Your Health Journey, Clearly Guided.'), 'Contains slogan: "Your Health Journey, Clearly Guided."');
  assert(homeContent.includes('Welcome to MediMentor'), 'Contains heading: "Welcome to MediMentor"');
  assert(
    homeContent.includes('Understand your health information, organize your medical records, and prepare for more informed conversations with your healthcare provider.'),
    'Contains exact supporting text for Welcome section'
  );
  assert(homeContent.includes('Patient Sign In'), 'Contains action button: "Patient Sign In"');
  assert(homeContent.includes('Create Patient Account'), 'Contains action button: "Create Patient Account"');
  assert(homeContent.includes('About MediMentor'), 'Contains bottom section heading: "About MediMentor"');
  assert(
    homeContent.includes('MediMentor helps you keep your healthcare journey organized by bringing your medical information into one accessible place.'),
    'Contains exact About MediMentor description text'
  );

  // Test 2: Check Auth.tsx content for required fields and tabs
  const authPath = path.resolve('src/pages/Auth.tsx');
  assert(fs.existsSync(authPath), 'Auth.tsx exists');
  const authContent = fs.readFileSync(authPath, 'utf8');

  assert(authContent.includes('Sign In'), 'Auth.tsx contains Sign In tab');
  assert(authContent.includes('Create Account'), 'Auth.tsx contains Create Account tab');
  assert(authContent.includes('Email Address'), 'Auth.tsx contains Email Address field');
  assert(authContent.includes('Password'), 'Auth.tsx contains Password field');
  assert(authContent.includes('Arjun K. Sharma'), 'Auth.tsx contains Arjun K. Sharma preset');
  assert(authContent.includes('Priya Sharma'), 'Auth.tsx contains Priya Sharma preset');
  assert(authContent.includes('New Patient'), 'Auth.tsx contains New Patient preset');
  assert(authContent.includes('256-bit TLS encrypted'), 'Auth.tsx contains TLS encryption security notice');
  assert(authContent.includes('Account Type'), 'Auth.tsx contains Account Type selector');
  assert(authContent.includes('Register Account'), 'Auth.tsx contains Register Account button');

  // Test 3: Check App.tsx for routing structure
  const appPath = path.resolve('src/App.tsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert(appContent.includes('<Route path="/" element={<HomePage />} />'), 'App.tsx mounts HomePage at root "/"');
  assert(appContent.includes('<Route path="/auth" element={<Auth />} />'), 'App.tsx mounts Auth at "/auth"');
  assert(appContent.includes('<Route path="/sign-in" element={<Auth />} />'), 'App.tsx mounts Auth at "/sign-in"');
  assert(appContent.includes('<Route path="/create-account" element={<Auth />} />'), 'App.tsx mounts Auth at "/create-account"');
  assert(appContent.includes('path="dashboard" element={<Dashboard />}'), 'App.tsx mounts Dashboard at "dashboard"');
  assert(appContent.includes('path="provider-portal" element={<ProviderPortal />}'), 'App.tsx mounts ProviderPortal without blocking');

  // Test 4: Token Generation & Verification
  const arjunToken = signJwt({ sub: 'user-arjun', name: 'Arjun K. Sharma', role: 'patient' });
  const arjunCheck = verifyJwt(arjunToken);
  assert(arjunCheck.valid && arjunCheck.payload?.sub === 'user-arjun', 'JWT signs and verifies for user-arjun');

  const guestToken = signJwt({ sub: 'user-guest', name: 'New Patient', role: 'patient' });
  const guestCheck = verifyJwt(guestToken);
  assert(guestCheck.valid && guestCheck.payload?.name === 'New Patient', 'JWT signs and verifies for user-guest');

  // Test 5: Verify build artifacts in dist/
  const distHtml = path.resolve('dist/index.html');
  assert(fs.existsSync(distHtml), 'dist/index.html exists from production build');

  console.log(`\n========================================`);
  console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
  if (failed === 0) {
    console.log('🎉 ALL HOMEPAGE & AUTHENTICATION TESTS PASSED 100%!');
  } else {
    process.exit(1);
  }
}

runTestSuite();
