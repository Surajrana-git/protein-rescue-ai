/**
 * FAKE DEMO DATA for ProteinRescue AI History & Reports.
 * Plant-based agro-industrial by-product protein valorization records.
 * All entries are sample demonstration records, not real reports.
 * 
 * Target counts:
 * Total: 48
 * Completed: 42
 * Processing: 3
 * Failed: 3
 * 
 * Fixed reference "today" date: 2026-10-24 11:00 UTC
 */

export const DEMO_NOW = '2026-10-24 11:00'

// 5 seed entries aligned with plant-based agro-waste protein analysis
const SEED_REPORTS = [
  {
    id: 'PRA-2026-1021',
    demo: true,
    status: 'Completed',
    fileName: 'Groundnut_Cake_Assay.pdf',
    uploadedAt: '2026-10-24 10:32',
    uploadedDisplay: '24 Oct 2026 10:32 AM',
    protein: 'Groundnut Albumin',
    confidence: 98,
    aiVersion: 'v2.1',
    uploader: 'Dr. Rohit Sharma',
    fileSize: '2.4 MB',
    analysisTime: '1 min 12 sec',
    progress: 100,
    reason: null,
  },
  {
    id: 'PRA-2026-1019',
    demo: true,
    status: 'Processing',
    fileName: 'Brewers_Spent_Grain.pdf',
    uploadedAt: '2026-10-24 09:15',
    uploadedDisplay: '24 Oct 2026 09:15 AM',
    protein: 'Identifying...',
    confidence: null,
    aiVersion: 'v2.1',
    uploader: 'Anjali Verma',
    fileSize: '1.8 MB',
    analysisTime: null,
    progress: 98,
    estimatedTime: '2 min',
    reason: null,
  },
  {
    id: 'PRA-2026-1015',
    demo: true,
    status: 'Completed',
    fileName: 'Defatted_Soy_Meal.pdf',
    uploadedAt: '2026-10-23 16:20',
    uploadedDisplay: '23 Oct 2026 04:20 PM',
    protein: 'Soy Globulin',
    confidence: 96,
    aiVersion: 'v2.1',
    uploader: 'Rahul Mehta',
    fileSize: '3.1 MB',
    analysisTime: '1 min 8 sec',
    progress: 100,
    reason: null,
  },
  {
    id: 'PRA-2026-1007',
    demo: true,
    status: 'Failed',
    fileName: 'Rice_Bran_Extract.jpg',
    uploadedAt: '2026-10-22 11:03',
    uploadedDisplay: '22 Oct 2026 11:03 AM',
    protein: null,
    confidence: null,
    aiVersion: 'v2.1',
    uploader: 'Neha Gupta',
    fileSize: '0.9 MB',
    analysisTime: null,
    progress: null,
    reason: 'Sample Turbidity High',
  },
  {
    id: 'PRA-2026-1002',
    demo: true,
    status: 'Completed',
    fileName: 'Canola_Meal_Digest.pdf',
    uploadedAt: '2026-10-20 15:45',
    uploadedDisplay: '20 Oct 2026 03:45 PM',
    protein: 'Canola Prolamin',
    confidence: 94,
    aiVersion: 'v2.1',
    uploader: 'Dr. Vikram Rao',
    fileSize: '1.5 MB',
    analysisTime: '1 min 15 sec',
    progress: 100,
    reason: null,
  },
]

// Deterministic generator for remaining 43 entries (IDs below 1002, dates before 20 Oct 2026)
// Required totals: 42 Completed (3 in seeds + 39 generated)
//                  3 Processing (1 in seed + 2 generated)
//                  3 Failed (1 in seed + 2 generated)
// Total generated = 39 + 2 + 2 = 43 entries.
const UPLOADERS = [
  'Aarav Patel', 'Priya Nair', 'Suresh Kumar', 'Deepa Joshi', 'Karan Singhal',
  'Sunita Rao', 'Manish Reddy', 'Kavita Das', 'Arjun Sen', 'Meera Pillai',
  'Alok Pandey', 'Pooja Iyer', 'Nikhil Bhat', 'Ritu Saxena', 'Devendra Chawla'
]

const PROTEINS = [
  'Groundnut Albumin',
  'Soy Globulin',
  'Rice Glutelin',
  'Canola Prolamin',
  'Brewer Protein',
  'Total Plant Protein'
]

const FILE_BASES = [
  'Groundnut_Meal_Assay',
  'Soy_Isolate_Digest',
  'Brewers_Spent_Protein',
  'Rice_Bran_Fraction',
  'Canola_Protein_Lab',
  'Sunflower_Meal_Assay',
  'Cottonseed_Protein_Test',
  'Sesame_Cake_Extract',
  'Mustard_Meal_Assay',
  'Agro_Residue_Isolate'
]

function generateDeterministicReports() {
  const generated = []
  
  // Specific indexes that will be Processing (2 entries) and Failed (2 entries)
  const processingIndices = new Set([8, 22])
  const failedIndices = new Set([14, 29])

  for (let i = 0; i < 43; i++) {
    const idNum = 1000 - i * 3
    const id = `PRA-2026-${String(idNum).padStart(4, '0')}`
    
    // Day calculation: dates descending from Oct 19 to Sept 15, 2026
    const day = 19 - Math.floor(i / 2)
    const monthStr = day >= 1 ? 'Oct' : 'Sep'
    const actualDay = day >= 1 ? day : 30 + day
    const hour = 9 + (i % 8)
    const minute = (i * 13) % 60
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour > 12 ? hour - 12 : hour
    const dateStr = `2026-${monthStr === 'Oct' ? '10' : '09'}-${String(actualDay).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    const displayStr = `${String(actualDay).padStart(2, '0')} ${monthStr} 2026 ${String(displayHour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${ampm}`
    
    const uploader = UPLOADERS[i % UPLOADERS.length]
    const fileBase = FILE_BASES[i % FILE_BASES.length]
    const ext = i % 7 === 0 ? 'jpg' : 'pdf'
    const fileName = `${fileBase}_${idNum}.${ext}`
    const protein = PROTEINS[i % PROTEINS.length]
    const confidence = 90 + ((i * 7) % 10) // 90% to 99%
    const sizeMb = (1.1 + (i % 25) * 0.1).toFixed(1)
    const sec = 45 + ((i * 11) % 40)

    let status = 'Completed'
    let progress = 100
    let reason = null
    let analysisTime = `1 min ${sec} sec`
    let reportedProtein = protein
    let reportedConfidence = confidence
    let estimatedTime = null

    if (processingIndices.has(i)) {
      status = 'Processing'
      progress = 75 + ((i * 5) % 20)
      reportedProtein = 'Identifying...'
      reportedConfidence = null
      analysisTime = null
      estimatedTime = `${1 + (i % 3)} min`
    } else if (failedIndices.has(i)) {
      status = 'Failed'
      progress = null
      reportedProtein = null
      reportedConfidence = null
      analysisTime = null
      reason = i % 2 === 0 ? 'Moisture Exceeds Limit' : 'Resolution Below Threshold'
    }

    generated.push({
      id,
      demo: true,
      status,
      fileName,
      uploadedAt: dateStr,
      uploadedDisplay: displayStr,
      protein: reportedProtein,
      confidence: reportedConfidence,
      aiVersion: 'v2.1',
      uploader,
      fileSize: `${sizeMb} MB`,
      analysisTime,
      progress,
      estimatedTime,
      reason,
    })
  }

  return generated
}

// In-memory reports storage
let currentReports = [...SEED_REPORTS, ...generateDeterministicReports()]

/**
 * Access function for reports.
 * Returns in-memory list (can be swapped with API call later).
 */
export function getReports() {
  return [...currentReports]
}

/**
 * Remove a demo report by ID in-memory.
 */
export function deleteReport(id) {
  currentReports = currentReports.filter((r) => r.id !== id)
  return [...currentReports]
}

/**
 * Reset demo reports back to initial set.
 */
export function resetReports() {
  currentReports = [...SEED_REPORTS, ...generateDeterministicReports()]
  return [...currentReports]
}
