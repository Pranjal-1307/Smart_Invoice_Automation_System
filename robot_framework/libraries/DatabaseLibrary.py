import os
import datetime
from robot.api.deco import keyword

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

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

class DatabaseLibrary:
    """
    Custom Robot Framework Python Library for Direct MongoDB Interactions & Audit Trace Persistence.
    """
    ROBOT_LIBRARY_SCOPE = 'GLOBAL'

    def __init__(self, mongodb_uri="mongodb://127.0.0.1:27017/smart_invoice_db"):
        self.mongodb_uri = os.environ.get("MONGODB_URI", mongodb_uri)
        self._client = None
        self._db = None

    def _get_db(self):
        if self._db is None and MongoClient is not None:
            try:
                self._client = MongoClient(self.mongodb_uri, serverSelectionTimeoutMS=2000)
                db_name = self.mongodb_uri.split("/")[-1].split("?")[0] or "smart_invoice_db"
                self._db = self._client[db_name]
            except Exception as e:
                print(f"[DatabaseLibrary] Mongo connection error: {e}")
                self._db = None
        return self._db

    @keyword("Check For Duplicate Invoice In MongoDB")
    def check_for_duplicate_invoice(self, invoice_data, collection_name="invoices"):
        """
        Queries MongoDB for an existing invoice matching:
        1. vendor / supplier
        2. invoice number
        3. invoice date
        4. total amount
        Returns found duplicate document or None.
        """
        invoice_data = _parse_invoice_dict(invoice_data)
        db = self._get_db()
        if db is None or not isinstance(invoice_data, dict):
            return None

        vendor = str(invoice_data.get("vendor") or "").strip()
        inv_num = str(invoice_data.get("invoiceNumber") or "").strip()
        date = str(invoice_data.get("date") or "").strip()
        total = invoice_data.get("total")

        # Skip duplicate check if essential fields are missing / unparsed / unknown
        if not vendor or vendor.lower() == "unknown vendor" or not inv_num or "UNPARSED" in inv_num.upper() or not date or total is None:
            return None

        try:
            total_val = float(total)
        except (ValueError, TypeError):
            return None

        doc_id = invoice_data.get("id")

        try:
            col = db[collection_name]
            import re
            query = {
                "vendor": {"$regex": f"^{re.escape(vendor)}$", "$options": "i"},
                "invoiceNumber": {"$regex": f"^{re.escape(inv_num)}$", "$options": "i"},
                "date": date,
                "total": {"$gte": round(total_val - 0.01, 2), "$lte": round(total_val + 0.01, 2)}
            }
            if doc_id:
                query["id"] = {"$ne": doc_id}

            existing = col.find_one(query)
            if existing and "_id" in existing:
                existing["_id"] = str(existing["_id"])
            return existing
        except Exception as err:
            print(f"[DatabaseLibrary] Error checking duplicate invoice: {err}")
            return None

    @keyword("Store Document In MongoDB")
    def store_document_in_mongodb(self, doc_data, collection_name="invoices"):
        """
        Stores an invoice or dataset record in MongoDB. Returns document ID or status string.
        """
        db = self._get_db()
        if db is not None:
            try:
                col = db[collection_name]
                if not doc_data.get("id"):
                    doc_data["id"] = f"INV-{int(datetime.datetime.now().timestamp()*1000)}"
                if not doc_data.get("createdAt"):
                    doc_data["createdAt"] = datetime.datetime.utcnow()
                doc_data["updatedAt"] = datetime.datetime.utcnow()
                
                col.update_one({"id": doc_data["id"]}, {"$set": doc_data}, upsert=True)
                return doc_data["id"]
            except Exception as err:
                print(f"[DatabaseLibrary] Error storing document in MongoDB: {err}")
                return doc_data.get("id", "MOCK-DOC-ID")
        return doc_data.get("id", "STORED-OFFLINE")

    @keyword("Write RPA Audit Log")
    def write_rpa_audit_log(self, action, details, user_email="robot@rpa.system"):
        """
        Writes an audit log trace into MongoDB auditlogs collection.
        """
        db = self._get_db()
        if db is not None:
            try:
                db["auditlogs"].insert_one({
                    "action": action,
                    "details": details,
                    "userEmail": user_email,
                    "timestamp": datetime.datetime.utcnow()
                })
                return True
            except Exception:
                pass
        return False
