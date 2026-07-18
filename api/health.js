export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

    // Simple ping to Supabase health check or just check if URL exists
    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ status: 'error', message: 'Missing database configuration' })
    }

    // Ping Supabase
    const startTime = Date.now()
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`
      }
    })
    const endTime = Date.now()
    
    if (response.ok) {
      res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        databaseLatencyMs: endTime - startTime,
        environment: process.env.NODE_ENV || 'production',
        version: process.env.npm_package_version || '1.9.0'
      })
    } else {
      res.status(502).json({
        status: 'degraded',
        message: 'Database connection failed',
        statusCode: response.status
      })
    }
  } catch (error) {
    res.status(500).json({
      status: 'down',
      message: error.message
    })
  }
}
