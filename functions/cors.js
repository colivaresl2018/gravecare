const allowedOrigins = [
  'https://gravecare.cl',
  'https://www.gravecare.cl',
  'https://operaciones.gravecare.cl',
  'http://localhost:5000',
  'http://localhost:3000'
];

module.exports = function handleCors(req, res) {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true; // Petición preflight manejada
  }
  return false;
};