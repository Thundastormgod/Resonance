// Test script for fetch-news API
// Run with: node scripts/test-fetch-news.js

import http from 'http';

const data = JSON.stringify({
  topic: 'technology',
  sources: ['bbc'],
  maxResults: 10
});

console.log('Testing fetch-news API...');
console.log('Request:', JSON.parse(data));
console.log('');

const options = {
  hostname: 'localhost',
  port: 5173,
  path: '/.netlify/functions/fetch-news',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('');
    
    try {
      const json = JSON.parse(body);
      console.log('✅ Headlines found:', json.headlines?.length || 0);
      console.log('Query:', json.query || 'N/A');
      console.log('Sources used:', json.sources?.join(', ') || 'N/A');
      console.log('Searched at:', json.searchedAt || 'N/A');
      console.log('Total results:', json.totalResults || 0);
      console.log('');
      
      if (json.headlines && json.headlines.length > 0) {
        console.log('=== HEADLINES ===');
        json.headlines.forEach((h, i) => {
          console.log(`\n[${i+1}] ${h.title}`);
          console.log(`    Source: ${h.source?.name || 'Unknown'}`);
          console.log(`    URL: ${h.url?.substring(0, 80)}...`);
          console.log(`    Published: ${h.publishedAt}`);
        });
      } else if (json.error) {
        console.log('❌ Error:', json.error);
        console.log('Message:', json.message);
      } else {
        console.log('⚠️ No headlines returned');
        console.log('Full response:', JSON.stringify(json, null, 2));
      }
    } catch(e) {
      console.log('❌ Failed to parse response');
      console.log('Raw response:', body.substring(0, 1000));
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Connection error:', e.message);
  console.log('');
  console.log('Make sure the server is running:');
  console.log('  npm run netlify:dev');
});

req.write(data);
req.end();
