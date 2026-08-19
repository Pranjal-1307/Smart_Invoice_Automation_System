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
    Executes the 13-step Robot Framework workflow:
    1. Receive processing request
    2. Start Robot Framework automation
    3. Detect uploaded file type
    4. Extract file content
    5. Classify document
    6. Select appropriate processing workflow
    7. Run invoice extraction or dataset processing
    8. Validate extracted information
    9. Calculate confidence or quality score
    10. Store results in MongoDB
    11. Update processing status
    12. Generate automation logs
    13. Return results to the application
    """
    doc_lib = DocumentLibrary()
    inv_lib = InvoiceLibrary()
    ds_lib = DatasetLibrary()
    db_lib = DatabaseLibrary()

    logs = []
    def rpa_log(msg):
        timestamp = datetime.datetime.now().strftime("%H:%M:%S")
        formatted = f"[ROBOT FRAMEWORK {timestamp}] {msg}"
        logs.append(formatted)
        try:
            print(formatted)
        except UnicodeEncodeError:
            print(formatted.encode('ascii', errors='replace').decode('ascii'))

    rpa_log("Step 1: Received processing request from Web Application")
    rpa_log("Step 2: Started Robot Framework RPA Automation Engine")

    filename = input_data.get("filename") or input_data.get("name") or "Uploaded_Document.pdf"
    raw_payload = input_data.get("fileDataUrl") or input_data.get("rawContent") or ""
    custom_vendor = input_data.get("customVendor") or ""
    custom_date = input_data.get("customDate") or ""
    notes = input_data.get("notes") or ""

    # Step 3: Detect uploaded file type
    file_type = doc_lib.detect_file_type_from_payload(raw_payload, filename)
    rpa_log(f"Step 3: Detected uploaded file type -> {file_type}")

    # Step 4: Extract file content & Step 5: Classify document
    doc_type = doc_lib.classify_document_type(raw_payload, file_type, filename)
    rpa_log(f"Step 4 & 5: Extracted content and classified document -> [{doc_type}]")

    # Step 6 & 7: Select workflow and run invoice extraction or dataset processing
    if doc_type == "INVOICE":
        rpa_log("Step 6 & 7: Selected Workflow -> Invoice Processing Robot")
        
        extracted_data = input_data.get("extracted") or {}
        
        # Step 8: Validate invoice information
        val_result = inv_lib.validate_invoice_fields_integrity(extracted_data)
        rpa_log(f"Step 8: Validated invoice fields -> Valid: {val_result['valid']}")
        
        # Step 9: Calculate confidence score
        confidence = inv_lib.calculate_invoice_confidence_score(extracted_data)
        status = inv_lib.determine_invoice_status(confidence, val_result)
        rpa_log(f"Step 9: Calculated Invoice Confidence Score -> {confidence * 100:.1f}% | Status: {status}")

        processed_doc = {
            **extracted_data,
            "status": status,
            "confidenceScore": confidence,
            "validation": val_result,
            "rpaEngine": "Robot Framework RPA Orchestration Layer",
            "processingLogs": logs + extracted_data.get("processingLogs", [])
        }

    else:
        rpa_log("Step 6 & 7: Selected Workflow -> Dataset Processing Robot")
        
        # Parse Dataset
        raw_rows = input_data.get("rawRows") or []
        parsed = ds_lib.parse_dataset_structure(raw_rows)
        headers = parsed["headers"]
        rows = parsed["rows"]
        
        # Step 8: Validate dataset structure
        metrics = ds_lib.validate_dataset_structure_and_columns(headers, rows)
        rpa_log(f"Step 8: Validated dataset structure -> Total rows: {metrics['totalRows']}, Cols: {metrics['columnCount']}")
        
        # Step 9: Calculate data quality score
        q_score = ds_lib.calculate_data_quality_score(metrics)
        status = ds_lib.determine_dataset_status(q_score)
        rpa_log(f"Step 9: Calculated Dataset Data Quality Score -> {q_score * 100:.1f}% | Status: {status}")
        
        # CRITICAL REQUIREMENT: Do NOT run invoice validation rules on generic dataset
        extracted_data = input_data.get("extracted") or {}
        processed_doc = {
            **extracted_data,
            "status": status,
            "confidenceScore": q_score,
            "qualityMetrics": metrics,
            "rpaEngine": "Robot Framework RPA Orchestration Layer",
            "processingLogs": logs + extracted_data.get("processingLogs", [])
        }

    # Step 10 & 11: Store results in MongoDB & update status
    rpa_log("Step 10 & 11: Storing workflow results in MongoDB and updating status...")
    doc_id = db_lib.store_document_in_mongodb(processed_doc)
    processed_doc["id"] = doc_id
    rpa_log(f"Step 10 & 11: MongoDB Persistence confirmed for document ID [{doc_id}]")

    # Step 12: Generate automation logs
    rpa_log(f"Step 12: Generated automation execution logs. Total log trace count: {len(logs)}")
    
    # Step 13: Return results to application
    rpa_log("Step 13: Returning orchestration results to Web Application")
    
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
