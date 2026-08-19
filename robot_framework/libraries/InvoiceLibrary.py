import math
import os
import re
import base64
from robot.api.deco import keyword

class InvoiceLibrary:
    """
    Custom Python Keyword Library for Robot Framework Invoice Processing RPA & Verification
    """

    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @keyword("Validate Invoice Totals")
    def validate_invoice_totals(self, subtotal, tax, total, shipping=0.0):
        """Validates that subtotal + tax + shipping equals total within 0.02 tolerance."""
        calc_total = round(float(subtotal) + float(tax) + float(shipping), 2)
        actual_total = round(float(total), 2)
        if abs(calc_total - actual_total) > 0.02:
            raise AssertionError(f"Total mismatch: Subtotal ({subtotal}) + Tax ({tax}) + Shipping ({shipping}) = {calc_total}, but got {actual_total}")
        return True

    @keyword("Validate Invoice Fields Integrity")
    def validate_invoice_fields_integrity(self, invoice_dict):
        """
        Validates vendor name, invoice number, dates, line items, and totals for an invoice.
        Returns dictionary of validation results (valid: bool, errors: list, warnings: list).
        """
        errors = []
        warnings = []

        vendor = str(invoice_dict.get('vendor', '')).strip()
        inv_num = str(invoice_dict.get('invoiceNumber', '')).strip()
        subtotal = float(invoice_dict.get('subtotal', 0))
        tax = float(invoice_dict.get('tax', 0))
        shipping = float(invoice_dict.get('shipping', 0))
        total = float(invoice_dict.get('total', 0))

        if not vendor or vendor == 'Unknown Vendor':
            errors.append("Vendor name is missing or unknown.")
            
        if not inv_num or 'UNPARSED' in inv_num:
            errors.append("Invoice Number is missing or unparsed.")

        calc_total = round(subtotal + tax + shipping, 2)
        if total > 0 and abs(calc_total - round(total, 2)) > 0.05:
            errors.append(f"Arithmetic mismatch: Subtotal ({subtotal}) + Tax ({tax}) + Shipping ({shipping}) = {calc_total}, but Grand Total is {total}")

        line_items = invoice_dict.get('lineItems', [])
        if not line_items:
            warnings.append("No individual line items parsed.")

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings
        }

    @keyword("Calculate Invoice Confidence Score")
    def calculate_invoice_confidence_score(self, invoice_dict):
        """
        Calculates field-weighted confidence score (0.0 to 1.0) based on extracted fields.
        """
        score = 0.0
        weights = {
            'vendor': 0.25,
            'invoiceNumber': 0.25,
            'date': 0.15,
            'totals': 0.25,
            'lineItems': 0.10
        }

        if invoice_dict.get('vendor') and invoice_dict.get('vendor') != 'Unknown Vendor':
            score += weights['vendor']
            
        if invoice_dict.get('invoiceNumber') and 'UNPARSED' not in invoice_dict.get('invoiceNumber'):
            score += weights['invoiceNumber']

        if invoice_dict.get('date'):
            score += weights['date']

        sub = float(invoice_dict.get('subtotal', 0))
        tx = float(invoice_dict.get('tax', 0))
        shp = float(invoice_dict.get('shipping', 0))
        tot = float(invoice_dict.get('total', 0))
        if tot > 0 and abs(round(sub + tx + shp, 2) - round(tot, 2)) <= 0.05:
            score += weights['totals']

        if invoice_dict.get('lineItems'):
            score += weights['lineItems']

        return round(score, 2)

    @keyword("Determine Invoice Status")
    def determine_invoice_status(self, confidence_score, validation_result):
        """
        Maps confidence score and validation results to status:
        HIGH_CONFIDENCE, PENDING_REVIEW, FLAGGED, or PROCESSING_FAILED.
        """
        score = float(confidence_score)
        valid = validation_result.get('valid', True) if isinstance(validation_result, dict) else bool(validation_result)

        if not valid:
            return "FLAGGED"
        if score >= 0.95:
            return "HIGH_CONFIDENCE"
        elif score >= 0.80:
            return "PENDING_REVIEW"
        elif score > 0:
            return "FLAGGED"
        else:
            return "PROCESSING_FAILED"

    @keyword("Generate Mock Invoice Payload")
    def generate_mock_invoice_payload(self, input_type="SINGLE_PDF", filename="RPA_Generated_Invoice.pdf"):
        """Generates realistic invoice payload for the ingestion endpoint."""
        pdf_path = os.path.join(os.path.dirname(__file__), "..", "..", "big_demo_invoice_usd.pdf")
        if os.path.exists(pdf_path):
            with open(pdf_path, "rb") as f:
                data_url = "data:application/pdf;base64," + base64.b64encode(f.read()).decode('utf-8')
            return {
                "inputType": input_type,
                "fileName": filename,
                "fileDataUrl": data_url,
                "fileType": "pdf"
            }
        
        sample_text = "INVOICE # INV-USD-2026-0847\nVendor: NEXORA TECHNOLOGIES LLC (billing@nexoratech.example)\nDate: 2026-08-19\nDue Date: 2026-09-18\nCurrency: USD\n1 Item Alpha 1 $100.00 0% $100.00\nSubtotal: $100.00\nTotal Due: $100.00"
        return {
            "inputType": input_type,
            "fileName": filename,
            "fileDataUrl": sample_text,
            "fileType": "text"
        }

    @keyword("Calculate Confidence Tier")
    def calculate_confidence_tier(self, confidence_score):
        """Returns confidence tier based on score."""
        score = float(confidence_score)
        if score >= 0.95:
            return "HIGH"
        elif score >= 0.85:
            return "MEDIUM"
        else:
            return "LOW"

    @keyword("Filter Pending Invoices")
    def filter_pending_invoices(self, invoice_list):
        """Filters a list of invoice dictionaries to return only those with PENDING status."""
        return [inv for inv in invoice_list if inv.get('status') in ['PENDING', 'PENDING_REVIEW']]

    @keyword("Summarize RPA Batch Run")
    def summarize_rpa_batch_run(self, processed_invoices):
        """Generates a summary string for a batch run."""
        total_count = len(processed_invoices)
        approved_count = sum(1 for inv in processed_invoices if inv.get('status') in ['APPROVED', 'HIGH_CONFIDENCE'])
        pending_count = sum(1 for inv in processed_invoices if inv.get('status') in ['PENDING', 'PENDING_REVIEW'])
        total_val = sum(float(inv.get('total', 0)) for inv in processed_invoices)
        return f"RPA Processed {total_count} invoices: {approved_count} Auto-Approved, {pending_count} Pending Review. Total Value: ${total_val:.2f}"
