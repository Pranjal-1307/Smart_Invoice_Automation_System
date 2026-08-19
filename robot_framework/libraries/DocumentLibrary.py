import os
import re
import base64
from robot.api.deco import keyword

class DocumentLibrary:
    """
    Custom Robot Framework Python Library for Document Type Detection & Classification.
    Classifies documents into INVOICE, DATASET, or UNKNOWN based on format, headers, and content patterns.
    """
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @keyword("Detect File Type From Payload")
    def detect_file_type_from_payload(self, file_path_or_payload, filename=""):
        """
        Detects normalized file extension (PDF, XLSX, XLS, CSV) from file path or base64 payload.
        """
        name = (filename or file_path_or_payload or "").lower()
        
        if name.endswith(".pdf"):
            return "PDF"
        if name.endswith(".xlsx"):
            return "XLSX"
        if name.endswith(".xls"):
            return "XLS"
        if name.endswith(".csv"):
            return "CSV"

        file_str = str(file_path_or_payload)
        if file_str.startswith("data:"):
            if "application/pdf" in file_str:
                return "PDF"
            if "spreadsheet" in file_str or "excel" in file_str:
                return "XLSX"
            if "text/csv" in file_str or "application/csv" in file_str:
                return "CSV"
        
        if "base64,JVBER" in file_str or file_str.startswith("JVBER"):
            return "PDF"
            
        return "UNKNOWN"

    @keyword("Classify Document Type")
    def classify_document_type(self, raw_text="", file_type="PDF", filename="", headers=None):
        """
        Classifies document as INVOICE, DATASET, or UNKNOWN.
        - INVOICE: Contains invoice keywords (invoice #, vendor, total, subtotal, due date, billing, PO)
        - DATASET: Tabular data with column headers, multiple records without single invoice header structure
        """
        text = str(raw_text or "").upper()
        fname = str(filename or "").upper()

        invoice_keywords = ["INVOICE", "INV-", "BILL TO", "TOTAL DUE", "SUBTOTAL", "TAX AMOUNT", "VENDOR", "PO NUMBER", "DUE DATE"]
        invoice_matches = sum(1 for kw in invoice_keywords if kw in text or kw in fname)

        dataset_keywords = ["DATASET", "BATCH", "CATALOG", "EXPORT", "INVENTORY", "RECORDS", "TRANSACTIONS", "TABLE"]
        dataset_matches = sum(1 for kw in dataset_keywords if kw in fname or kw in text)

        if file_type in ["CSV", "XLSX", "XLS"]:
            if "DATASET" in fname or "LIST" in fname or "EXPORT" in fname:
                return "DATASET"
            if invoice_matches >= 2:
                return "INVOICE"
            if headers and isinstance(headers, list):
                header_str = " ".join([str(h).upper() for h in headers])
                if any(k in header_str for k in ["QTY", "PRICE", "AMOUNT", "ITEM"]) and not any(k in header_str for k in ["INVOICE", "BILL TO", "DUE DATE"]):
                    return "DATASET"
            if dataset_matches > 0 or invoice_matches < 2:
                return "DATASET"

        if invoice_matches >= 1 or file_type == "PDF":
            return "INVOICE"

        if dataset_matches >= 1:
            return "DATASET"

        return "INVOICE" if file_type == "PDF" else "DATASET"
