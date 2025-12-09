// FILE: src/pages/api/debug/test.js
// Simple debug endpoint to test API routing in Vercel

export default async function handler(req, res) {
  const { method } = req;
  
  console.log(`[DEBUG] /api/debug/test - ${method} request received`);
  console.log('[DEBUG] Headers:', Object.keys(req.headers));
  console.log('[DEBUG] Query:', req.query);
  console.log('[DEBUG] Body:', req.body);

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,HEAD,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    return res.status(200).end();
  }

  const responseData = {
    message: 'Debug endpoint working correctly',
    method: method,
    timestamp: new Date().toISOString(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      vercel: !!process.env.VERCEL,
      vercelUrl: process.env.VERCEL_URL
    },
    request: {
      method: method,
      headers: Object.keys(req.headers).reduce((acc, key) => {
        // Only include safe headers for debugging
        if (['content-type', 'user-agent', 'accept'].includes(key.toLowerCase())) {
          acc[key] = req.headers[key];
        }
        return acc;
      }, {}),
      query: req.query,
      hasBody: !!req.body,
      bodyKeys: req.body ? Object.keys(req.body) : []
    }
  };

  switch (method) {
    case 'GET':
      return res.status(200).json({
        ...responseData,
        message: 'GET request successful'
      });
    
    case 'POST':
      return res.status(200).json({
        ...responseData,
        message: 'POST request successful',
        receivedData: req.body
      });
    
    case 'PUT':
    case 'PATCH':
      return res.status(200).json({
        ...responseData,
        message: `${method} request successful`
      });
    
    default:
      return res.status(405).json({
        ...responseData,
        error: `Method ${method} not allowed`,
        allowedMethods: ['GET', 'POST', 'PUT', 'PATCH']
      });
  }
}