import math
import os
import re
import base64
from robot.api.deco import keyword

def _parse_invoice_dict(data):
    if isinstance(data, dict):
        return data
    if isinstance(data, str):
        data_str = data.strip()
        if not data_str:
            return {}
        try:
            import json
            return json.loads(data_str)
        except Exception:
            pass
        try:
            import ast
            parsed = ast.literal_eval(data_str)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        try:
            import re
            parsed = {}
            pairs = re.findall(r'(\w+)\s*[=:]\s*([^,;]+)', data_str)
            for k, v in pairs:
                v_clean = v.strip().strip('"\'')
                try:
                    if '.' in v_clean:
                        parsed[k] = float(v_clean)
                    else:
                        parsed[k] = int(v_clean)
                except ValueError:
                    parsed[k] = v_clean
            if parsed:
                return parsed
        except Exception:
            pass
    return {}

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

    @keyword("Check Duplicate Invoice In Data")
    def check_duplicate_invoice_in_data(self, invoice_dict, existing_invoices):
        """
        Checks if invoice_dict matches any invoice in existing_invoices based on:
        1. vendor
        2. invoiceNumber
        3. date
        4. total
        Returns the matched invoice dictionary or None.
        """
        invoice_dict = _parse_invoice_dict(invoice_dict)
        if not isinstance(invoice_dict, dict) or not isinstance(existing_invoices, list):
            return None

        vendor = str(invoice_dict.get('vendor', '')).strip().lower()
        inv_num = str(invoice_dict.get('invoiceNumber', '')).strip().lower()
        date = str(invoice_dict.get('date', '')).strip()

        if not vendor or vendor == 'unknown vendor' or not inv_num or 'unparsed' in inv_num or not date:
            return None

        try:
            total = round(float(invoice_dict.get('total', 0)), 2)
        except (ValueError, TypeError):
            return None

        curr_id = invoice_dict.get('id')

        for item in existing_invoices:
            if not isinstance(item, dict):
                continue
            if curr_id and item.get('id') == curr_id:
                continue
            item_vendor = str(item.get('vendor', '')).strip().lower()
            item_inv_num = str(item.get('invoiceNumber', '')).strip().lower()
            item_date = str(item.get('date', '')).strip()
            try:
                item_total = round(float(item.get('total', 0)), 2)
            except (ValueError, TypeError):
                continue

            if (item_vendor == vendor and 
                item_inv_num == inv_num and 
                item_date == date and 
                abs(item_total - total) <= 0.01):
                return item

        return None

    @keyword("Apply Duplicate Invoice Flag")
    def apply_duplicate_invoice_flag(self, invoice_dict, existing_doc=None):
        """
        Applies DUPLICATE_INVOICE flag reasons and status to the invoice dictionary.
        """
        invoice_dict = _parse_invoice_dict(invoice_dict)
        vendor = invoice_dict.get('vendor', 'Unknown Vendor')
        inv_no = invoice_dict.get('invoiceNumber', 'N/A')
        msg = f"Duplicate invoice detected: invoice {inv_no} from {vendor} already exists."

        existing_id = existing_doc.get('id', 'Existing') if isinstance(existing_doc, dict) else 'Existing'
        flag_reason = {
            "reasonCode": "DUPLICATE_INVOICE",
            "severity": "HIGH",
            "message": msg,
            "field": "invoiceNumber",
            "validation": "DUPLICATE_INVOICE_CHECK",
            "expected": "Unique invoice",
            "actual": f"Duplicate invoice exists in MongoDB (ID: {existing_id})",
            "difference": None,
            "scoreImpact": -30,
            "confidenceImpact": -30,
            "qualityImpact": 0
        }

        flag_reasons = invoice_dict.get('flagReasons', [])
        if not isinstance(flag_reasons, list):
            flag_reasons = []
        if not any(fr.get('reasonCode') == 'DUPLICATE_INVOICE' for fr in flag_reasons if isinstance(fr, dict)):
            flag_reasons.append(flag_reason)
        invoice_dict['flagReasons'] = flag_reasons

        val_results = invoice_dict.get('validationResults', [])
        if isinstance(val_results, list) and not any(vr.get('reasonCode') == 'DUPLICATE_INVOICE' for vr in val_results if isinstance(vr, dict)):
            val_results.append(flag_reason)
            invoice_dict['validationResults'] = val_results

        invoice_dict['status'] = 'FLAGGED'
        invoice_dict['decisionReason'] = f"File flagged: {msg}"
        invoice_dict['recommendedAction'] = "Verify if this invoice is a duplicate submission before proceeding."
        return invoice_dict

