*** Settings ***
Documentation    Duplicate Invoice Detection RPA Keywords for Robot Framework
Resource         logging.resource
Library          ../libraries/InvoiceLibrary.py
Library          ../libraries/DatabaseLibrary.py

*** Keywords ***
Run Duplicate Invoice Detection Robot
    [Arguments]    ${invoice_dict}
    [Documentation]    Checks MongoDB before invoice persistence: if match exists on (vendor, invoiceNumber, date, total), flag with DUPLICATE_INVOICE.
    Log Automation Execution Step    Starting Duplicate Invoice Detection Robot...

    ${dup_found}=    Check For Duplicate Invoice In MongoDB    ${invoice_dict}
    IF    $dup_found is not None
        ${flagged_invoice}=    Apply Duplicate Invoice Flag    ${invoice_dict}    ${dup_found}
        Log Automation Execution Step    Duplicate detected: ${flagged_invoice['decisionReason']} | Status: FLAGGED
        RETURN    ${flagged_invoice}
    ELSE
        Log Automation Execution Step    No duplicate found. Invoice verified for database storage.
        RETURN    ${invoice_dict}
    END
