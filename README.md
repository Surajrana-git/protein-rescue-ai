# ProteinRescue AI

> **Smart Protein Project | NIFTEM-K (MOFPI India) | Hack The Fork 2026**  
> An intelligent computational platform for upcycling agro-industrial press-cakes into safe, functional, and economically viable plant-based proteins.

---

## Overview

India generates tens of millions of metric tons of agro-processing residues annually—including groundnut press-cake, defatted soybean meal, rice bran, and guar meal. While these by-products contain 14% to 50%+ crude protein, high levels of anti-nutritional factors (ANFs like phytates and tannins), safety risks (such as aflatoxins in groundnuts), and bitter off-flavor volatiles prevent their direct use in human food applications.

**ProteinRescue AI** provides an end-to-end computational screening and validation pipeline:
1. **Instant Multi-Modal Lab Ingestion**: Extracts crude protein %, phytates, and tannins from lab test reports (PDF, images, DOCX, CSV) with audit-proof citations.
2. **Biochemical Kinetic Simulator**: Models temperature and duration-dependent enzyme activity to forecast phytate and tannin degradation alongside functional protein retention.
3. **Off-Flavor & Debittering Engine**: Simulates sensory evolution across 4 flavor dimensions (bitter, beany, astringent, earthy) and formulates debittering cocktails paired with botanical maskers.
4. **Deterministic Safety Gating**: Enforces strict FSSAI/Codex compliance rules (e.g. programmatically locking human-food routing for groundnut cake if accredited aflatoxin test results are not on file).
5. **Techno-Economic Parity Analysis**: Benchmarks treated flour against imported commercial pea protein isolate (showing up to ~80% cost reduction per kg pure protein).
6. **Publication-Grade PDF Reports**: Generates multi-page vector analytical dossiers with full kinetic trajectories, cost waterfalls, and laboratory assay validation checklists.

---

## System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Vite + React 18)                      │
│  - Home Guided 4-Step Analysis Wizard                                  │
│  - /history-report (Plant-based agro-waste analytical archive)         │
│  - /safety-check (8-parameter quality & anti-nutrient monitor)         │
│  - /help-centre & topic guides                                         │
│  - Native HTML5 dialogs, responsive design tokens, zero heavy UI-kits  │
└───────────────────▲────────────────────────────────┬───────────────────┘
                    │                                │
        JSON / REST │ Port 5174                      │ Multipart (Max 10 MB)
                    │                                ▼
┌───────────────────┴────────────────────────────────────────────────────┐
│                        BACKEND SERVER (Express 5.3)                    │
│                                                                        │
│  1. POST /api/extract-report                                           │
│     - In-memory buffer parsing (never written to disk for privacy)     │
│     - Regex & OCR heuristics with page and evidence tagging            │
│                                                                        │
│  2. POST /api/analyze                                                  │
│     - AWS Bedrock runtime integration ('us.amazon.nova-micro-v1:0')    │
│     - Deterministic kinetic simulation fallback engine                 │
│                                                                        │
│  3. POST /api/report                                                   │
│     - Isolated Python 3 subprocess running generator.py                │
│     - Vector graphics pipeline via ReportLab, Matplotlib, NumPy        │
│     - Concurrency limiter (max 2 parallel reports)                     │
└────────────────────────────────────────────────────────────────────────┘
```

---

## Supported Feedstocks

* **Groundnut Cake (Peanut Press-Cake)**: 40%–52% protein, phytate/tannin removal, mandatory aflatoxin safety gating.
* **Guar Meal (Korma / Churi)**: 38%–48% protein, galactomannan reduction, aquaculture and functional protein enrichment.
* **Stabilized Rice Bran**: 14%–18% protein, phytase-assisted dephytinization, hypoallergenic infant food grade.
* **Defatted Soybean Meal**: 44%–50% protein, trypsin inhibitor degradation, soy globulin fractioning.
* **Brewer’s Spent Grain (BSG)**: 20%–28% protein, fiber-protein recovery for functional baking.
* **Canola / Mustard Meal**: 34%–40% protein, glucosinolate and sinapine reduction for savory seasoning isolates.

---

## Key Techno-Economic Metrics

* **Base Groundnut Cake**: ₹35.0 / kg
* **Process Utility (Thermal & Water)**: ₹2.0 / kg
* **Enzyme Cocktail (Phytase, Tannase, Aminopeptidase)**: ₹4.5 / kg
* **Clean-Label Taste Package (Date paste, Carob, Citric acid, Salt)**: ₹8.3 / kg
* **Total Cost of Treated Flour**: **₹49.8 / kg** (~₹50 / kg)
* **Effective Cost per kg Pure Protein (at 96% retention)**: **~₹108 / kg protein**
* **Market Benchmark (Imported Pea Isolate @ ₹450/kg, 80% purity)**: **₹562.5 / kg protein**
* **Cost Advantage**: **~80.8% savings** against imported pea isolate.

---

## Getting Started

### Prerequisites
* **Node.js** >= 18.0.0
* **pnpm** >= 8.0.0
* **Python** >= 3.9 (with `reportlab`, `matplotlib`, `numpy`, `Pillow` for PDF report generation)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd protein-rescue-ai

# Install frontend & backend dependencies with pnpm
pnpm install

# Setup Python environment for the report generator
cd server/report
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cd ../..
```

### Running Locally

```bash
# Start backend server (listening on http://127.0.0.1:3001)
node server/index.js &

# Start Vite dev server (listening on http://localhost:5174)
pnpm run dev
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

### Production Build

```bash
pnpm run build
```

---

## Safety & Governance Compliance

ProteinRescue AI enforces conservative safety rules:
* All computational outputs are labeled as unvalidated estimates requiring empirical laboratory validation (AOAC 992.23 Dumas combustion crude protein assay, HPLC-RID for phytates/tannins, SEC-HPLC molecular profile).
* Groundnut cake cannot be routed to human consumption without accredited analytical certificates for aflatoxins on file.
* Uploaded files are processed strictly in-memory and are never permanently stored or logged.

---

## License

Private and confidential. Built for Hack The Fork 2026.
