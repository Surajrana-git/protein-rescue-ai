// Vercel Serverless Function: /api/health
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.status(200).json({ status: 'ok' })
}
