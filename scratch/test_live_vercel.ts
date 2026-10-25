import { signJwt } from '../api/auth';

async function testLiveVercel() {
  const token = signJwt({ sub: 'user-arjun', name: 'Arjun K. Sharma', role: 'patient' });
  const liveUrl = 'https://medimentor-ai-beryl.vercel.app/api/chat';

  console.log(`Testing Live Vercel Endpoint: ${liveUrl}`);

  // Test 1: Greeting
  try {
    const res = await fetch(liveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello! How are you doing today?' }],
        userProfile: { name: 'Arjun K. Sharma' },
        language: 'en',
      }),
    });

    console.log(`Live Greeting Response Status: HTTP ${res.status}`);
    const data: any = await res.json();
    console.log(`Live Greeting Model Name: ${data.modelName}`);
    console.log(`Live Greeting Is Fallback: ${data.isFallback}`);
    console.log(`Live Greeting Reply:\n${data.reply}\n`);
  } catch (err: any) {
    console.error('Live Greeting Error:', err.message);
  }

  // Test 2: General Blood Pressure
  try {
    const res = await fetch(liveUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'What is normal blood pressure?' }],
        userProfile: { name: 'Arjun K. Sharma' },
        language: 'en',
      }),
    });

    console.log(`Live BP Response Status: HTTP ${res.status}`);
    const data: any = await res.json();
    console.log(`Live BP Model Name: ${data.modelName}`);
    console.log(`Live BP Reply snippet: ${data.reply.slice(0, 150)}...\n`);
  } catch (err: any) {
    console.error('Live BP Error:', err.message);
  }
}

testLiveVercel();
