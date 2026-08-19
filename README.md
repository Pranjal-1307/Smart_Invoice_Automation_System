# ⚡ Smart Invoice Automation System

An end-to-end **Robotic Process Automation (RPA)** and **AI-Driven Invoice Processing System** built with **Node.js, Express, MongoDB (Mongoose), SheetJS (xlsx), pdf-parse, JavaScript (ES6+), and Robot Framework**.

This application automates multi-source invoice ingestion (PDF, Multi-page PDF, Excel `.xlsx`/`.xls`, CSV datasets), intelligent document extraction, dynamic confidence scoring, arithmetic validation, role-based approval workflows, database audit logging, ML pattern model training, and automated RPA test suite execution.

---

## 🎯 Key Features

- 🔐 **User Authentication & Role-Based Access Control (RBAC)**
  - Password security using `bcryptjs` (salt rounds: 10).
  - Three distinct role-based dashboards:
    - **AP Clerk (`AP_CLERK`)**: Ingest and process single/batch PDFs, CSV datasets, and Excel spreadsheets. Restricted from approval/rejection actions (403 Forbidden).
    - **Finance Manager (`FINANCE_MANAGER`)**: Review pending invoices, execute individual or bulk approvals based on confidence thresholds (≥95%), reject invoices with feedback notes, and view financial analytics.
    - **System Admin (`ADMIN`)**: Full administrative control, user inspection grid, engine diagnostics, AI model retraining, and complete database purge/reset capabilities.

- 📄 **Multi-Format Ingestion & Intelligent Document Processing**
  - **Supported Input Formats**: `SINGLE_PDF`, `MULTIPLE_PDF`, `SINGLE_EXCEL` (`.xlsx`, `.xls`), `SINGLE_CSV`, and `DATASET_CSV`.
  - **Extraction Pipeline**:
    - **PDF Extractor** ([`pdfExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/pdfExtractor.js)): Native text parsing via `pdf-parse` with fallback object stream regex scanner. Parses table line items, header metadata, payment terms, currency codes, and financial totals.
    - **Excel Extractor** ([`excelExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/excelExtractor.js)): SheetJS integration with keyword-density sheet selection, horizontal/vertical label mapping, percentage discount parsing, and line-item grid detection.
    - **CSV Extractor** ([`csvExtractor.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/csvExtractor.js)): RFC-compliant parser with auto-delimiter detection (`,`, `;`, `|`, `\t`), quoted field parsing, embedded comma support, and metadata header extraction.
  - **Arithmetic Audit Validator** ([`invoiceNormalizer.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/extractors/invoiceNormalizer.js)): Validates `Subtotal + Tax + Shipping = Grand Total` and verifies line item amounts `(Qty × Unit Price × (1 - Discount%) = Amount)`.
  - **Confidence Scoring & Status Engine**: Assigns a 0–100% confidence score based on field presence and mathematical validity. Invoices with scores <85% or arithmetic warnings are automatically marked as `FLAGGED`.

- 🤖 **AI Model Training Engine**
  - Trainable pattern matching engine ([`train_model.js`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/train_model.js)) that tokenizes corpus text, calculates keyword frequency weights, compiles regex extraction heuristics, and serializes output to [`models/trained_invoice_model.json`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/models/trained_invoice_model.json).
  - On-the-fly retraining via `POST /api/train` REST endpoint.

- 🖥️ **Interactive Single Page Application (SPA)**
  - Modern, responsive UI with glassmorphic elements, CSS grid layouts, animated pipeline steps, and modal inspection views.
  - Live Key Performance Indicators (KPIs): Total Invoices, Pending Approvals, Approved, Rejected, Monetary Value ($), and Average Confidence Score (%).
  - Search, filter, and user submission inspection tools.

- 🗄️ **MongoDB Persistence & Audit Trail**
  - Schema models for `User`, `Invoice`, and `AuditLog`.
  - Automatic Database Seeding: Creates default accounts (`admin@invoice.com`, `manager@invoice.com`, `user@invoice.com`) and benchmark invoice records on first launch.
  - Audit Trail: Log entries for login, signup, document extraction runs, individual/bulk approvals, rejections, model retraining, and system resets.

- 🤖 **Robot Framework RPA & Test Automation**
  - Python runner script ([`run_robot.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/run_robot.py)) executing Robot Framework test suites ([`api_tests.robot`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/api_tests.robot)) and RPA automation tasks ([`rpa_tasks.robot`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/rpa_tasks.robot)).
  - Custom Python keyword library ([`InvoiceLibrary.py`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/libraries/InvoiceLibrary.py)) and reusable resource keywords ([`invoice_keywords.resource`](file:///c:/Users/shahp/OneDrive/Desktop/College/SEM_9/RPA/Invoice_System/robot_framework/resources/invoice_keywords.resource)).
  - Automated HTML log and test report generation (`log.html`, `report.html`).

---

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend Framework** | Node.js, Express.js |
| **Database & ODM** | MongoDB, Mongoose |
| **Document Parsers** | SheetJS (`xlsx`), `pdf-parse` |
| **Authentication** | Bcryptjs, Session / Local Storage |
| **Frontend UI** | HTML5, CSS3 (Vanilla), JavaScript ES6+ |
| **RPA & Quality Assurance** | Python 3, Robot Framework |

---

## 📁 Project Structure

```
Invoice_System/
├── extractors/
│   ├── pdfExtractor.js                 # PDF text extraction & parsing routines (422 lines)
│   ├── excelExtractor.js               # Excel workbook sheet selection & parsing (528 lines)
│   ├── csvExtractor.js                 # Multi-delimiter RFC-compliant CSV parser (430 lines)
│   └── invoiceNormalizer.js            # Normalization, validation & confidence engine (169 lines)
├── models/
│   ├── User.js                         # Mongoose schema for User accounts (32 lines)
│   ├── Invoice.js                      # Mongoose schema for Invoice records (170 lines)
│   ├── AuditLog.js                     # Mongoose schema for Audit Trail (17 lines)
│   └── trained_invoice_model.json      # Serialized ML model weights & rules (206 lines)
├── public/
│   ├── index.html                      # Single Page Application HTML markup (824 lines)
│   ├── style.css                       # Modern layout, components & theme styles (2,836 lines)
│   └── app.js                          # Frontend SPA state, API handlers & DOM rendering (1,578 lines)
├── robot_framework/
│   ├── api_tests.robot                 # Robot Framework REST API test suite (62 lines)
│   ├── rpa_tasks.robot                 # Robot Framework RPA execution tasks (56 lines)
│   ├── libraries/
│   │   └── InvoiceLibrary.py           # Custom Python helper keyword library (67 lines)
│   ├── resources/
│   │   └── invoice_keywords.resource   # Reusable keyword definitions (92 lines)
│   └── results/                        # Generated execution reports (log.html, report.html)
├── test_files/                         # Standardized test CSV datasets
│   ├── csv_metadata_items.csv
│   ├── csv_items_only.csv
│   ├── csv_semicolon.csv
│   ├── csv_quoted_desc.csv
│   └── csv_multi_currency.csv
├── big_demo_invoice_usd.pdf            # 2-page benchmark PDF invoice (36 line items)
├── demo_invoice.xlsx                   # Benchmark Excel invoice (INR currency)
├── demo_invoice_xlsx_orbit_eur.xlsx    # Benchmark Excel invoice (EUR currency)
├── create_test_pdf.py                  # Python script to generate benchmark PDF (238 lines)
├── documentExtractor.js                # Format routing engine (138 lines)
├── multipage_pdf_payload.json          # Sample base64 API payload
├── run_robot.py                        # Python launcher for Robot Framework (39 lines)
├── server.js                           # Express server, REST endpoints & seeding (620 lines)
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
