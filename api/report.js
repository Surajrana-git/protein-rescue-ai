/**
 * Vercel Serverless Function: POST /api/report
 * PDF report generation requires a Python runtime with ReportLab + Matplotlib
 * which is not available in Vercel's Node.js serverless environment.
 * Returns a clear message directing users to the local dev setup.
 */
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(204).end()

  return res.status(503).json({
    error: 'Service Unavailable',
    message: 'PDF report generation is not available in the cloud demo. Run the project locally with node server/index.js to generate full analytical PDF reports.',
  })
}
