import sys
import os
import json
import datetime
import traceback

# Ensure robot_framework directory is in python path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
RF_DIR = os.path.join(BASE_DIR, "robot_framework")
if RF_DIR not in sys.path:
    sys.path.insert(0, RF_DIR)

from libraries.DocumentLibrary import DocumentLibrary
from libraries.InvoiceLibrary import InvoiceLibrary
from libraries.DatasetLibrary import DatasetLibrary
from libraries.DatabaseLibrary import DatabaseLibrary

def orchestrate_document_processing(input_data):
    """
    Main Robot Framework RPA Orchestration Engine Entry Point.
    Executes the 13-step Robot Framework workflow with structured logging.
    """
    doc_lib = DocumentLibrary()
    inv_lib = InvoiceLibrary()
    ds_lib = DatasetLibrary()
    db_lib = DatabaseLibrary()

    logs = []
    def rpa_log(msg):
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        formatted = f"[RPA {timestamp}] {msg}"
        logs.append(formatted)
        try:
            print(formatted)
        except UnicodeEncodeError:
            print(formatted.encode('ascii', errors='replace').decode('ascii'))

    rpa_log("Starting document processing")
    
    filename = input_data.get("filename") or input_data.get("name") or "Uploaded_Document.pdf"
    raw_payload = input_data.get("fileDataUrl") or input_data.get("rawContent") or ""
    extracted_data = input_data.get("extracted") or {}

    # Detect file type & classify document
    file_type = doc_lib.detect_file_type_from_payload(raw_payload, filename)
    rpa_log(f"File type detected: {file_type}")

    doc_type = extracted_data.get("documentType") or doc_lib.classify_document_type(raw_payload, file_type, filename)
    rpa_log(f"Document classified: {doc_type}")

    if doc_type == "INVOICE":
        rpa_log("Running Invoice Processing Workflow")
        
        vendor = extracted_data.get("vendor", "Unknown Vendor")
        inv_no = extracted_data.get("invoiceNumber", "N/A")
        line_items = extracted_data.get("lineItems") or []
        subtotal = float(extracted_data.get("subtotal") or 0)
        total = float(extracted_data.get("total") or 0)

        logs.append(f"[EXTRACTION] Vendor detected: {vendor}")
        logs.append(f"[EXTRACTION] Invoice Number detected: {inv_no}")
        logs.append(f"[EXTRACTION] Line Items detected: {len(line_items)}")

        calc_subtotal = round(sum(float(item.get("amount") or item.get("total") or 0) for item in line_items), 2)
        logs.append(f"[VALIDATION] Calculated line item subtotal: ${calc_subtotal:,.2f}")
        logs.append(f"[VALIDATION] Extracted invoice subtotal: ${subtotal:,.2f}")

        flag_reasons = extracted_data.get("flagReasons") or []
        if flag_reasons:
            for fr in flag_reasons:
                code = fr.get("reasonCode") or "VALIDATION_ERROR"
                sev = fr.get("severity") or "HIGH"
                diff = fr.get("difference")
                diff_str = f" | Difference: ${diff:,.2f}" if isinstance(diff, (int, float)) else ""
                logs.append(f"[VALIDATION FAILED]\nReason: {code}\nSeverity: {sev}{diff_str}")

        conf_score = float(extracted_data.get("confidenceScore") or 0)
        conf_pct = int(conf_score * 100 if conf_score <= 1.0 else conf_score)
        threshold = int(extracted_data.get("threshold") or 85)

        logs.append(f"[CONFIDENCE] Score: {conf_pct}%")
        logs.append(f"[CONFIDENCE] Required threshold: {threshold}%")

        status = extracted_data.get("status") or "FLAGGED"
        logs.append(f"[DECISION] Status: {status}")
        if flag_reasons:
            logs.append("[DECISION] Reasons:")
            for idx, fr in enumerate(flag_reasons, 1):
                logs.append(f"{idx}. {fr.get('reasonCode')} - {fr.get('message')}")

        processed_doc = {
            **extracted_data,
            "rpaEngine": "Robot Framework RPA Orchestration Layer",
            "processingLogs": logs + extracted_data.get("processingLogs", [])
        }

    else:
        rpa_log("Running Dataset Processing Workflow")
        
        raw_rows = input_data.get("rawRows") or []
        parsed = ds_lib.parse_dataset_structure(raw_rows)
        headers = parsed["headers"]
        rows = parsed["rows"]
        
        metrics = ds_lib.validate_dataset_structure_and_columns(headers, rows)
        logs.append(f"[EXTRACTION] Dataset columns detected: {metrics['columnCount']}")
        logs.append(f"[EXTRACTION] Dataset total rows: {metrics['totalRows']}")
        logs.append(f"[VALIDATION] Empty cell count: {metrics['missingCount']} ({metrics['missingRatio']*100:.1f}%)")

        flag_reasons = extracted_data.get("flagReasons") or []
        if flag_reasons:
            for fr in flag_reasons:
                code = fr.get("reasonCode") or "VALIDATION_ERROR"
                sev = fr.get("severity") or "HIGH"
                logs.append(f"[VALIDATION FAILED]\nReason: {code}\nSeverity: {sev}")

        q_score = float(extracted_data.get("dataQualityScore") or (extracted_data.get("confidenceScore", 0) * 100))
        threshold = int(extracted_data.get("threshold") or 80)
        logs.append(f"[QUALITY] Score: {q_score:.0f}%")
        logs.append(f"[QUALITY] Required threshold: {threshold}%")

        status = extracted_data.get("status") or "FLAGGED_FOR_REVIEW"
        logs.append(f"[DECISION] Status: {status}")
        if flag_reasons:
            logs.append("[DECISION] Reasons:")
            for idx, fr in enumerate(flag_reasons, 1):
                logs.append(f"{idx}. {fr.get('reasonCode')} - {fr.get('message')}")

        processed_doc = {
            **extracted_data,
            "rpaEngine": "Robot Framework RPA Orchestration Layer",
            "processingLogs": logs + extracted_data.get("processingLogs", [])
        }

    # Store in MongoDB
    rpa_log("Storing workflow results in MongoDB...")
    doc_id = db_lib.store_document_in_mongodb(processed_doc)
    processed_doc["id"] = doc_id
    rpa_log(f"MongoDB Persistence confirmed for document ID [{doc_id}]")
    
    return {
        "success": True,
        "rpaEngine": "Robot Framework",
        "docType": doc_type,
        "document": processed_doc,
        "logs": logs
    }

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            input_json_str = sys.argv[1]
            input_data = json.loads(input_json_str)
            res = orchestrate_document_processing(input_data)
            print(json.dumps(res))
        except Exception as e:
            traceback.print_exc()
            print(json.dumps({"success": False, "error": str(e)}))
