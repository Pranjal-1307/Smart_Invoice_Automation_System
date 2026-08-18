# Smart Invoice Automation System

An end-to-end **Robotic Process Automation (RPA)** and **Intelligent Invoice Processing Engine** built with **Node.js, Express, MongoDB (Mongoose), SheetJS (xlsx), JavaScript, and Robot Framework**.

This application automates multi-source invoice ingestion, OCR/native text parsing, automated arithmetic validation, role-based approval workflows, database audit logging, ML-based parser training, and RPA test suite execution.

---

## Features

- **User Authentication & Role-Based Access Control (RBAC)**
  - Secured with `bcryptjs` password hashing.
  - Three distinct user roles:
    - **AP Clerk (`AP_CLERK`)**: Ingest and process invoices (Single PDF, Batch PDF, CSV Datasets, Excel Spreadsheets). Restricted from approval/rejection actions.
    - **Finance Manager (`FINANCE_MANAGER`)**: Review pending invoices, execute individual or bulk approvals based on confidence thresholds, and reject invoices with feedback notes.
    - **System Admin (`ADMIN`)**: Full system permissions, including database purge and system reset capabilities.

- **Intelligent Document Processing Engine**
  - **Multi-Format Ingestion**: Supports `SINGLE_PDF`, `MULTIPLE_PDF`, CSV (`SINGLE_CSV`/`DATASET_CSV`), and Excel Spreadsheets (`SINGLE_EXCEL`, `.xlsx`, `.xls` formats).
  - **High-Accuracy Parser Routines**:
    - **PDF Extractor**: Native text scanning and fallback regex extraction.
    - **Excel Extractor**: Leverages SheetJS (`xlsx`) to extract tabular sheets, calculate range offsets, and parse structured metadata/lines.
    - **Dynamic CSV Parser**: Supports multiple delimiters (comma, semicolon), automatic header mapping, and quote handling.
  - **Automated Confidence Scoring**: Evaluates extraction accuracy against weighted metrics (Vendor, Inv #, Date, Totals). Items with confidence scores >94% are automatically marked for quick/auto approval, while lower-confidence files flag AP Clerks or Managers for verification.
  - **Arithmetic Audit Validator**: Verifies that extracted totals adhere to the standard mathematical constraint: `Subtotal + Tax + Shipping = Grand Total`. Highlights warnings/errors for invoice details that fail validation.

- **AI Model Training Engine**
  - Uses machine learning token frequency weights and learned regex layouts (`train_model.js`) to train the extraction model on custom invoice keywords.
  - Serializes learned parameters directly to MongoDB schema controls and locally under `models/trained_invoice_model.json`.

- **Interactive Real-Time Dashboard**
  - Key Performance Indicators (KPIs): Total Invoices, Pending Approvals, Approved, Rejected, Total Monetary Value ($), and Average Confidence Score (%).
  - Full Invoice Detail View & Processing History: View line items, tax breakdown, confidence percentages, and time-stamped audit logs per invoice.
  - Smooth UI: Responsive, modern interface with zero horizontal overflow, quick action modals, and dynamic login/signup overlays.

- **MongoDB Database Integration & Audit Logging**
  - Mongoose models for `User`, `Invoice`, and `AuditLog`.
  - Automatic Database Seeding: Auto-populates initial default roles and sample benchmark invoices on first launch.
  - Audit Trail: Tracks account registrations, logins, approval/rejection actions, document processing runs, and system resets.

- **Robot Framework RPA & Automated Testing**
  - Integrated Python runner (`run_robot.py`) for Robot Framework automation tasks and REST API test suites.
  - Automated report generation (`log.html`, `report.html`) saved under `robot_framework/results/`.

---

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: MongoDB (Mongoose ORM)
- **Parser Engines**: SheetJS (`xlsx`), `pdf-parse`
- **Authentication**: Bcrypt.js, REST API Sessions
- **Frontend**: HTML5, CSS3 (Vanilla), Modern ES6+ JavaScript
- **RPA & Automation**: Python 3, Robot Framework

---

## Project Structure

```
Invoice_System/
├── extractors/
│   ├── pdfExtractor.js       # Extract text from PDFs using pdf-parse & rules
│   ├── excelExtractor.js     # Parses spreadsheet files (XLS/XLSX) via SheetJS
│   ├── csvExtractor.js       # Custom multi-delimiter CSV parser
│   └── invoiceNormalizer.js  # Field normalizer and arithmetic auditor
├── models/
│   ├── User.js               # User schema (email, password, role)
│   ├── Invoice.js            # Invoice schema (metadata, items, totals, log history)
│   ├── AuditLog.js           # System audit log schema
│   └── trained_invoice_model.json # Serialized ML model weights and rules
├── public/
│   ├── index.html            # Single-page Application UI structure
│   ├── style.css             # Modern layout & responsive design styles
│   └── app.js                # Frontend logic, API communication, & DOM renderer
├── robot_framework/
│   ├── api_tests.robot       # Robot Framework REST API Test Suite
│   ├── rpa_tasks.robot       # Robot Framework RPA Execution Tasks
│   └── results/              # Test reports & detailed log output
├── run_robot.py              # Python wrapper script for Robot Framework
├── server.js                 # Express server, MongoDB connection, & REST endpoints
├── train_model.js            # Script to train/update the ML parser weights
├── test_extraction.js        # Native PDF parser correctness verification test
├── test_spreadsheet_csv.js   # Dynamic CSV/Excel workbook verification test
├── package.json              # Node.js project manifest & scripts
└── README.md                 # System documentation
```

---

## Getting Started

### Prerequisites

1. **Node.js** (v14+ recommended)
2. **MongoDB** running locally on the default port (`mongodb://127.0.0.1:27017/smart_invoice_db`) or set a custom connection URI via the `MONGODB_URI` environment variable.
3. **Python 3** and **Robot Framework** (optional, for running RPA test suites).

### 1. Installation

Clone the repository and install the Node dependencies:

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

### 3. Running the Server

Start the application server:

```bash
npm start
```

The system will start on `http://localhost:3000`. On initial boot, MongoDB will be seeded with default user accounts and sample invoices.

---

## Default User Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **System Admin** | `admin@invoice.com` | `admin123` | Full control, Database Purge/Reset |
| **Finance Manager** | `manager@invoice.com` | `admin123` | Review, Approve, Bulk Approve, Reject |
| **AP Clerk** | `user@invoice.com` | `user123` | Ingest PDFs, Excel, & CSV Datasets |

---

## API Endpoints Summary

### Authentication APIs
- `POST /api/auth/signup` - Register a new user account with role assignment.
- `POST /api/auth/login` - Authenticate user credentials.
- `GET /api/users` - Fetch all registered users with submission and approval metrics (*Admin only*).

### Invoice Management APIs
- `GET /api/invoices` - Fetch all invoices sorted by creation date.
- `GET /api/invoices/:id/download` - Download the base64 source file record for a specific invoice.
- `GET /api/stats` - Fetch live metrics dashboard statistics & database connection status.
- `POST /api/process` - Execute document processing engine (PDF single/batch, CSV, Excel).
- `POST /api/approve` - Approve a single invoice (*Finance Manager/Admin*).
- `POST /api/approve-bulk` - Bulk approve invoices above a confidence threshold (*Finance Manager/Admin*).
- `POST /api/reject` - Reject an invoice with custom feedback (*Finance Manager/Admin*).
- `POST /api/reset` - Clear all invoice records (*Admin only*).

### ML Model Training APIs
- `POST /api/train` - Retrain the extraction model dynamically from training corpus data (*Admin only*).

---

## Verification & Local Tests

You can verify the extraction logic and tabular cell calculation routines using the following test scripts:

### Test Native PDF Field Extractor
```bash
node test_extraction.js
```

### Test CSV/Excel Parser Compatibility
```bash
node test_spreadsheet_csv.js
```

---

## Robot Framework RPA Automation

Run automated RPA tasks and API test suites via `npm` scripts or `run_robot.py`:

### Run RPA Automation Tasks
```bash
npm run rpa:robot
# or
python run_robot.py rpa
```

### Run Automated API Tests
```bash
npm run test:robot
# or
python run_robot.py api
```

Log outputs and HTML test execution reports are automatically generated under `robot_framework/results/log.html` and `report.html`.
