import os
import datetime
from robot.api.deco import keyword

try:
    from pymongo import MongoClient
except ImportError:
    MongoClient = None

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
