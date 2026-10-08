*** Settings ***
Documentation    Dedicated Robot Framework RPA Workflow for Duplicate Invoice Detection
Resource         ../resources/common.resource
Resource         ../resources/duplicate.resource
Resource         ../resources/invoice.resource
Resource         ../resources/mongodb.resource
Resource         ../resources/logging.resource
Library          ../libraries/InvoiceLibrary.py
Library          ../libraries/DatabaseLibrary.py

*** Variables ***
&{INVOICE_DATA}=      &{EMPTY}
&{SAMPLE_INVOICE}=    vendor=NEXORA TECHNOLOGIES LLC    invoiceNumber=INV-USD-2026-0847    date=2026-08-19    total=863747.32

*** Tasks ***
Execute Duplicate Invoice Detection Robot Workflow
    [Documentation]    Checks MongoDB before invoice persistence. Receives real invoice data or falls back to isolated test data if run independently.
    ${is_empty}=    Run Keyword And Return Status    Should Be Empty    ${INVOICE_DATA}
    IF    ${is_empty}
        ${target_invoice}=    Set Variable    ${SAMPLE_INVOICE}
    ELSE
        ${target_invoice}=    Set Variable    ${INVOICE_DATA}
    END
    ${result}=    Run Duplicate Invoice Detection Robot    ${target_invoice}
