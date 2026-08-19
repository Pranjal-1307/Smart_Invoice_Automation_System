# 🤖 Smart Invoice Automation System

An **RPA-Based Smart Invoice and Document Automation System** powered by **Robot Framework as the main automation engine and RPA orchestration layer**.

- **Robot Framework = Main Automation Engine & RPA Orchestrator**
- **AI Invoice Model = Supporting Extraction Component**
- **MongoDB = Data Storage**
- **Web Application (HTML/CSS/JS) = User Interface**

---

## 🎯 System Architecture & Responsibilities

```text
                    USER / ADMIN
                         │
                         ▼
                    WEB APPLICATION
                         │
                         ▼
              🤖 ROBOT FRAMEWORK 🤖
                RPA ORCHESTRATOR
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
   FILE PROCESSING   AI EXTRACTION    VALIDATION
        │                │                │
        ├──── PDF        ├─ Invoice       ├─ Invoice
        ├──── CSV        │  Patterns      │  Validation
        └──── XLSX       │                │
                         └─ OCR / AI      └─ Dataset
                                                Validation
        │                │                │
        └────────────────┼────────────────┘
                         │
                         ▼
                    MONGODB
                         │
                         ▼
               DASHBOARD / REPORTS
```

### Robot Framework RPA Workflow Steps:
1. Receive processing request from Web Application
2. Start Robot Framework automation
3. Detect uploaded file type (`PDF`, `XLSX`, `XLS`, `CSV`)
4. Extract file content & structure
5. Classify document (`INVOICE`, `DATASET`, or `UNKNOWN`)
6. Select appropriate processing workflow
7. Run Invoice Extraction or Dataset Processing Workflow
8. Validate extracted information
9. Calculate confidence or quality score
10. Store results in MongoDB
11. Update processing status
12. Generate automation logs
13. Return results to the application

---

## 🚀 Separate Robot Framework Workflows

### 1. Invoice Processing Robot Workflow (`process_invoice.robot`)
- Extracts PDF / Excel / CSV invoices
- Calls AI / Pattern Extraction Model for vendor & pattern recognition
- Normalizes invoice fields (vendor, invoice number, dates, line items, totals)
- Validates vendor, invoice number, dates, line items, and arithmetic (`Subtotal + Tax + Shipping = Total`)
- Calculates Invoice Confidence Score
- Maps status (`HIGH_CONFIDENCE`, `PENDING_REVIEW`, `FLAGGED`, `PROCESSING_FAILED`)
- Persists result in MongoDB

### 2. Dataset Processing Robot Workflow (`process_dataset.robot`)
- Parses generic CSV or Excel datasets
- Detects table headers & column structure
- Validates dataset structure, required columns, missing values, and data types
- Calculates Data Quality Score (0 - 100%)
- Sets status (`VALIDATED`, `DATA_QUALITY_OK`, `ATTENTION_REQUIRED`)
- **Crucial Rule**: Generic datasets are **NEVER** flagged for missing vendor, missing invoice number, missing due date, or missing grand total. Those checks belong only to the Invoice Processing Robot.

---

## 📁 Modular Robot Framework Directory Structure

```text
robot_framework/
│
├── tasks/
│   ├── process_document.robot      # Main RPA Orchestrator task (Ingestion, Classification, Routing)
│   ├── process_invoice.robot       # Dedicated Invoice Processing Robot Task
│   ├── process_dataset.robot       # Dedicated Dataset Processing Robot Task
│   └── validate_document.robot    # Dedicated Document Validation Robot Task
│
├── resources/
│   ├── common.resource             # Common variables & global keywords
│   ├── invoice.resource            # Invoice extraction & verification keywords
│   ├── dataset.resource            # Dataset quality & column keywords
│   ├── mongodb.resource            # Database persistence keywords
│   ├── logging.resource            # Automation log formatting keywords
│   └── invoice_keywords.resource   # Legacy keyword compatibility suite
│
└── libraries/
    ├── DocumentLibrary.py          # File type detection & document classification
    ├── InvoiceLibrary.py           # Invoice validation, confidence score & tier mapping
    ├── DatasetLibrary.py           # Tabular dataset parsing & quality scoring
    └── DatabaseLibrary.py          # PyMongo direct database driver & audit log trace
```
├── test_extraction.js                  # PDF extraction verification script (127 lines)
├── test_spreadsheet_csv.js             # Excel & CSV test verification suite (234 lines)
├── train_model.js                      # AI model training script (193 lines)
├── package.json                        # Node.js manifest & scripts
└── README.md                           # System documentation
```

---

## 🚀 Getting Started

### Prerequisites

1. **Node.js** (v18+ recommended)
2. **MongoDB** running locally on `mongodb://127.0.0.1:27017/smart_invoice_db` (or specify via `MONGODB_URI` environment variable)
3. **Python 3** & **Robot Framework** (optional, required for RPA test suites)

### 1. Installation

Clone the repository and install Node.js dependencies:

```bash
npm install
```

### 2. Train the Extraction Model

Initialize the ML weights and regex heuristics for invoice classification:

```bash
npm run train:model
# or
node train_model.js
```

### 3. Start the Server

Launch the backend application server:

```bash
npm start
```

The web server will start at `http://localhost:3000`. On first launch, MongoDB will automatically be seeded with default credentials and benchmark invoices.

---

## 🔑 Default User Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@invoice.com` | `admin123` | Full access, Database Reset, User Inspection, Model Retraining |
| **Finance Manager** | `manager@invoice.com` | `admin123` | Review Pending Invoices, Single Approval, Bulk Approval (≥95%), Rejection |
| **AP Clerk** | `user@invoice.com` | `user123` | Upload Single PDF, Batch PDF, CSV, & Excel Spreadsheets |

---

## 📡 API Endpoints Reference

### Authentication APIs
- `POST /api/auth/signup` - Register a new user account with role assignment (`AP_CLERK`, `FINANCE_MANAGER`, `ADMIN`).
- `POST /api/auth/login` - Authenticate user credentials and return user profile session object.
- `GET /api/users` - Fetch list of all registered users with submission stats (*Admin only*).

### Invoice & Processing APIs
- `GET /api/invoices` - Retrieve all invoices sorted by creation date.
- `GET /api/invoices/:id/download` - Download base64 original source document.
- `GET /api/stats` - Live dashboard KPI metrics (counts, values, average confidence score).
- `POST /api/process` - Execute document processing engine (`SINGLE_PDF`, `MULTIPLE_PDF`, `SINGLE_EXCEL`, `SINGLE_CSV`, `DATASET_CSV`).
- `POST /api/approve` - Approve a single pending invoice (*Finance Manager/Admin*).
- `POST /api/approve-bulk` - Bulk approve pending invoices with confidence score ≥95% (*Finance Manager/Admin*).
- `POST /api/reject` - Reject an invoice with custom feedback notes (*Finance Manager/Admin*).
- `POST /api/reset` - Clear all invoice records and reset system state (*Admin only*).

### ML Model Training APIs
- `POST /api/train` - Retrain invoice pattern extraction model dynamically (*Admin only*).

---

## 🧪 Verification & Test Automation

### 1. Test Native PDF Field Extractor
Runs 13 automated assertions against `big_demo_invoice_usd.pdf`:
```bash
node test_extraction.js
```

### 2. Test Excel & CSV Parser Compatibility
Runs 7 comprehensive test suites across `.xlsx`, `.xls`, and multi-delimiter CSV files:
```bash
node test_spreadsheet_csv.js
```

---

## 🤖 Robot Framework RPA Automation

Execute Robot Framework RPA tasks and API test suites via Python runner or npm scripts:

### Run RPA Automation Tasks
```bash
npm run rpa:robot
# or
python run_robot.py rpa
```

### Run Automated REST API Test Suite
```bash
npm run test:robot
# or
python run_robot.py api
```

Execution logs and reports are generated automatically under `robot_framework/results/log.html` and `robot_framework/results/report.html`.
