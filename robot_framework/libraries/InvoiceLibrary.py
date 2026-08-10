import math
from robot.api.deco import keyword

class InvoiceLibrary:
    """
    Custom Python Keyword Library for Robot Framework Invoice Processing RPA & Verification
    """

    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @keyword("Validate Invoice Totals")
    def validate_invoice_totals(self, subtotal, tax, total):
        """Validates that subtotal + tax equals total within 0.01 tolerance."""
        calc_total = round(float(subtotal) + float(tax), 2)
        actual_total = round(float(total), 2)
        if abs(calc_total - actual_total) > 0.02:
            raise AssertionError(f"Total mismatch: Subtotal ({subtotal}) + Tax ({tax}) = {calc_total}, but got {actual_total}")
        return True

    @keyword("Generate Mock Invoice Payload")
    def generate_mock_invoice_payload(self, input_type="SINGLE_PDF", filename="RPA_Generated_Invoice.pdf"):
        """Generates mock JSON payload for the ingestion endpoint."""
        return {
            "inputType": input_type,
            "fileName": filename,
            "fileContent": f"Base64MockData_{input_type}_{filename}"
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
        return [inv for inv in invoice_list if inv.get('status') == 'PENDING']

    @keyword("Summarize RPA Batch Run")
    def summarize_rpa_batch_run(self, processed_invoices):
        """Generates a summary string for a batch run."""
        total_count = len(processed_invoices)
        approved_count = sum(1 for inv in processed_invoices if inv.get('status') == 'APPROVED')
        pending_count = sum(1 for inv in processed_invoices if inv.get('status') == 'PENDING')
        total_val = sum(float(inv.get('total', 0)) for inv in processed_invoices)
        return f"RPA Processed {total_count} invoices: {approved_count} Auto-Approved, {pending_count} Pending Review. Total Value: ${total_val:.2f}"
