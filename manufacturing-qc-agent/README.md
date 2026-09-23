# Manufacturing Process Quality Control Agent

An AI-powered web application for manufacturing quality control using IBM watsonx.ai and IBM Granite models.

---

## Architecture Overview

```
manufacturing-qc-agent/
├── backend/                   # Python FastAPI backend
│   ├── main.py                # All API routes
│   ├── config.py              # IBM watsonx.ai credentials & thresholds
│   ├── .env.example           # Environment variable template
│   ├── requirements.txt       # Python dependencies
│   ├── models/
│   │   └── schemas.py         # Pydantic data models
│   ├── data/
│   │   ├── data_processor.py  # CSV ingestion, cleaning, feature engineering
│   │   └── sample_data.py     # Synthetic dataset generator
│   ├── agents/
│   │   ├── process_monitoring_agent.py  # Threshold-based anomaly detection
│   │   ├── quality_analysis_agent.py   # Isolation Forest classification
│   │   ├── defect_prediction_agent.py  # Random Forest defect prediction
│   │   └── optimization_agent.py       # Corrective action recommendations
│   ├── rag/
│   │   └── knowledge_base.py  # Manufacturing QC documentation + TF-IDF retrieval
│   └── watsonx/
│       └── watsonx_client.py  # IBM Granite / watsonx.ai integration
│
├── frontend/                  # React + Vite frontend
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx            # Sidebar layout + routing
│       ├── index.css          # Global industrial dark theme
│       ├── api/api.js         # Axios client for all API calls
│       └── pages/
│           ├── Dashboard.jsx
│           ├── DataUpload.jsx
│           ├── ProcessMonitoring.jsx
│           ├── QualityAnalysis.jsx
│           ├── DefectPrediction.jsx
│           ├── Optimization.jsx
│           ├── AIAssistant.jsx
│           └── Reports.jsx
│
└── sample_manufacturing_data.csv  # Sample dataset for demo
```

---

## Multi-Agent Workflow

```
User uploads CSV
      ↓
 Data Validation & Cleaning (data_processor.py)
      ↓
  ┌───────────────────────────────────┐
  │  Process Monitoring Agent         │  → Rule-based threshold checks
  │  (process_monitoring_agent.py)    │  → Generates CRITICAL / WARNING alerts
  └───────────────────────────────────┘
      ↓
  ┌───────────────────────────────────┐
  │  Quality Analysis Agent           │  → Isolation Forest anomaly detection
  │  (quality_analysis_agent.py)      │  → z-score contributing factors
  └───────────────────────────────────┘
      ↓
  ┌───────────────────────────────────┐
  │  Defect Prediction Agent          │  → Random Forest classifier
  │  (defect_prediction_agent.py)     │  → Per-record defect probability
  └───────────────────────────────────┘
      ↓
  ┌───────────────────────────────────┐
  │  Process Optimization Agent       │  → Rule-based corrective actions
  │  (optimization_agent.py)          │  → Prioritised recommendations
  └───────────────────────────────────┘
      ↓
  RAG Knowledge Base retrieval
      ↓
  IBM Granite (watsonx.ai) — LLM explanation & QA
      ↓
  Dashboard + Reports
```

---

## Quick Start

### Prerequisites

- Python 3.9+ 
- Node.js 18+
- (Optional) IBM Cloud account with watsonx.ai project

---

### Step 1 — Backend Setup

```bash
cd manufacturing-qc-agent/backend

# Create a virtual environment (recommended)
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Copy the environment template
copy .env.example .env         # Windows
# cp .env.example .env         # macOS / Linux

# Start the FastAPI server
uvicorn main:app --reload --port 8000
```

The backend API will be available at: **http://localhost:8000**  
API documentation (Swagger UI): **http://localhost:8000/docs**

---

### Step 2 — Frontend Setup

```bash
cd manufacturing-qc-agent/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be available at: **http://localhost:3000**

---

### Step 3 — Open the Application

Navigate to **http://localhost:3000** in your browser.

The application starts with a built-in synthetic dataset of 200 production records so you can explore all features immediately without uploading a file.

To test with real data, use the **Data Upload** page and upload the included `sample_manufacturing_data.csv`.

---

## IBM watsonx.ai / Granite Configuration

### Getting Credentials

1. Sign up for [IBM Cloud](https://cloud.ibm.com)
2. Create a **watsonx.ai** service instance
3. Create a new **Project** in watsonx.ai
4. Generate an **API key** from IBM Cloud → Manage → API keys

### Connecting Credentials

Edit `manufacturing-qc-agent/backend/.env`:

```env
WATSONX_API_KEY=your_actual_ibm_cloud_api_key
WATSONX_PROJECT_ID=your_watsonx_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-13b-instruct-v2
```

### Available Granite Models

| Model ID | Description |
|---|---|
| `ibm/granite-13b-instruct-v2` | General instruction-following (recommended) |
| `ibm/granite-34b-code-instruct` | Code & technical analysis |
| `ibm/granite-3-8b-instruct` | Lightweight, fast responses |

After adding credentials, **restart the backend server**. The header bar will show **"IBM Granite Connected"** in green.

### Installing the IBM SDK

```bash
pip install ibm-watsonx-ai
```

Then uncomment the SDK line in `requirements.txt`:

```
ibm-watsonx-ai>=1.0.0
```

---

## Running Without IBM Credentials (Demo Mode)

The application is **fully functional without IBM credentials**. In demo mode:

- All four AI agents run using rule-based logic and ML models (scikit-learn)
- The AI Assistant uses RAG + template responses
- The header shows **"Granite: Demo Mode"** in yellow
- All dashboard, monitoring, quality, defect, and optimization pages work fully

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/health` | GET | Health check + watsonx status |
| `/api/upload` | POST | Upload CSV dataset |
| `/api/dataset` | GET | Paginated dataset records |
| `/api/summary` | GET | Dashboard KPI summary |
| `/api/charts/process-parameters` | GET | Time-series chart data |
| `/api/monitoring` | GET | Process Monitoring Agent results |
| `/api/monitoring/alerts` | GET | Filtered alert list |
| `/api/quality` | GET | Quality Analysis Agent results |
| `/api/defects` | GET | Defect Prediction Agent results |
| `/api/optimizations` | GET | Optimization recommendations |
| `/api/chat` | POST | AI Assistant (IBM Granite + RAG) |
| `/api/report` | GET | Full quality report |

---

## Sample Dataset

A `sample_manufacturing_data.csv` file is included with 40 records. For a larger dataset, the backend auto-generates 200 synthetic records on startup.

### CSV Format

Your CSV must contain at least one of these parameter columns:

| Column | Units | Normal Range |
|---|---|---|
| temperature | °C | 60–85 |
| pressure | bar | 4.5–7.5 |
| speed / rpm | RPM | 1000–1800 |
| torque | Nm | 30–50 |
| vibration | mm/s | 0.1–0.6 |
| tool_wear | min | 0–200 |
| quality_label | 0/1 | 0=normal |

Many column name variants are accepted — see the Data Upload page for the full mapping table.

---

## Technology Stack

| Component | Technology |
|---|---|
| Backend | Python 3.9, FastAPI, Uvicorn |
| AI / ML | scikit-learn (Isolation Forest, Random Forest), TF-IDF |
| LLM Integration | IBM watsonx.ai SDK, IBM Granite |
| RAG | TF-IDF retrieval (swap to vector DB for production) |
| Frontend | React 18, Vite, React Router 6 |
| Charts | Recharts |
| Icons | Lucide React |

---

## Extending for Production

1. **Replace TF-IDF with a vector store**: Use FAISS, Chroma, or IBM Watson Discovery for semantic RAG
2. **Persist the ML models**: Serialize trained models with `joblib` instead of retraining on every request
3. **Add authentication**: Add JWT or IBM IAM-based auth to the FastAPI routes
4. **Database**: Replace the in-memory session dict with PostgreSQL + SQLAlchemy
5. **LangFlow integration**: The agent workflow can be visualised and orchestrated in LangFlow by wrapping each agent as a LangFlow component

---

*Built for IBM watsonx.ai + IBM Granite — Manufacturing AI College Project*
