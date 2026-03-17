const https = require('https');

let currentRefreshToken = process.env.AGENDRIX_REFRESH_TOKEN;
let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function post(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const u = new URL(url);
    const req = https.request({
      hostname: u.hostname, path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve(JSON.parse(raw)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'app.agendrix.com', path, method: 'GET',
      headers: { 'Authorization': `Bearer ${token}`, 'Accept': 'application/json' }
    }, res => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function getAccessToken() {
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) return cachedAccessToken;
  const resp = await post('https://app.agendrix.com/oauth/token', {
    client_id: process.env.AGENDRIX_CLIENT_ID,
    client_secret: process.env.AGENDRIX_CLIENT_SECRET,
    redirect_uri: 'https://duraclim.com',
    grant_type: 'refresh_token',
    refresh_token: currentRefreshToken
  });
  if (!resp.access_token) throw new Error('Token refresh failed: ' + JSON.stringify(resp));
  currentRefreshToken = resp.refresh_token;
  cachedAccessToken = resp.access_token;
  tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000;
  return cachedAccessToken;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { from, to } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to required (YYYY-MM-DD)' });

    const token = await getAccessToken();

    const empResp = await get('/api/v1/employees?per_page=200', token);
    const employees = empResp.body.data || [];
    const empMap = {};
    employees.forEach(e => { empMap[e.id] = `${e.attributes.first_name} ${e.attributes.last_name}`.trim(); });

    const teResp = await get(`/api/v1/time_entries?from=${from}&to=${to}&per_page=500`, token);
    const entries = teResp.body.data || [];

    const result = {};
    entries.forEach(e => {
      const attr = e.attributes;
      if (!attr.started_at || !attr.ended_at) return;
      const date = attr.started_at.substring(0, 10);
      const hours = (new Date(attr.ended_at) - new Date(attr.started_at)) / 3600000;
      const empId = e.relationships?.employee?.data?.id;
      const name = empMap[empId] || `ID:${empId}`;
      const key = `${date}__${name}`;
      if (!result[key]) result[key] = { date, name, hours: 0 };
      result[key].hours += hours;
    });

    res.status(200).json({ data: Object.values(result) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
