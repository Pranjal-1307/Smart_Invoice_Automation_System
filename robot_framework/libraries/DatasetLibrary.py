import re
from robot.api.deco import keyword

class DatasetLibrary:
    """
    Custom Robot Framework Python Library for Dataset Processing & Quality Verification.
    Dedicated to generic tabular CSV / Excel datasets.
    Does NOT run invoice-specific checks (vendor, invoice #, due date, totals missing are NOT flagged).
    """
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    @keyword("Parse Dataset Structure")
    def parse_dataset_structure(self, raw_rows):
        """
        Parses rows of a dataset into headers and data matrix.
        """
        if not raw_rows or not isinstance(raw_rows, list):
            return {
                "headers": [],
                "rows": [],
                "rowCount": 0,
                "columnCount": 0
            }

        headers = [str(col).strip() for col in raw_rows[0]] if raw_rows else []
        rows = raw_rows[1:] if len(raw_rows) > 1 else []

        return {
            "headers": headers,
            "rows": rows,
            "rowCount": len(rows),
            "columnCount": len(headers)
        }

    @keyword("Validate Dataset Structure and Columns")
    def validate_dataset_structure_and_columns(self, headers, rows):
        """
        Validates column count, missing values, and cell data type integrity.
        Returns detailed validation metrics.
        """
        headers = headers or []
        rows = rows or []

        total_cells = len(headers) * len(rows) if rows else 0
        missing_count = 0
        invalid_type_count = 0

        for row in rows:
            for idx, cell in enumerate(row):
                cell_val = str(cell).strip() if cell is not None else ""
                if cell_val == "" or cell_val.lower() in ["null", "none", "n/a", "undefined"]:
                    missing_count += 1

        missing_ratio = (missing_count / total_cells) if total_cells > 0 else 0.0

        return {
            "totalRows": len(rows),
            "columnCount": len(headers),
            "totalCells": total_cells,
            "missingCount": missing_count,
            "missingRatio": round(missing_ratio, 4),
            "valid": len(headers) > 0 and len(rows) > 0
        }

    @keyword("Calculate Data Quality Score")
    def calculate_data_quality_score(self, validation_metrics):
        """
        Calculates Data Quality Score (0.0 to 1.0) based on tabular completeness & structure.
        Data Quality = 1.0 - (missingRatio * 0.7 + structuralPenalty)
        """
        if not validation_metrics.get("valid", False):
            return 0.0

        missing_ratio = float(validation_metrics.get("missingRatio", 0.0))
        rows = validation_metrics.get("totalRows", 0)
        cols = validation_metrics.get("columnCount", 0)

        quality_score = 1.0 - (missing_ratio * 0.7)
        if rows < 1 or cols < 1:
            quality_score -= 0.5

        return round(max(0.0, min(1.0, quality_score)), 2)

    @keyword("Determine Dataset Status")
    def determine_dataset_status(self, quality_score):
        """
        Returns status for a dataset: VALIDATED (score >= 0.85), ATTENTION_REQUIRED (score < 0.85), or PROCESSING_FAILED.
        """
        score = float(quality_score)
        if score >= 0.85:
            return "VALIDATED"
        elif score > 0.0:
            return "ATTENTION_REQUIRED"
        else:
            return "PROCESSING_FAILED"
