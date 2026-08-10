*** Settings ***
Documentation    Reusable Robot Framework Keywords for Smart Invoice Automation System RPA & API Verification
Library          RequestsLibrary
Library          Collections
Library          ../libraries/InvoiceLibrary.py

*** Variables ***
${BASE_URL}       http://localhost:3000
${SESSION_NAME}   InvoiceSession

*** Keywords ***
Connect To Invoice Server
    [Documentation]    Creates an HTTP session with the Smart Invoice server
    Create Session    ${SESSION_NAME}    ${BASE_URL}    verify=True

Reset Database State
    [Documentation]    Resets the MongoDB invoice store back to empty
    ${response}=    POST On Session    ${SESSION_NAME}    /api/reset
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}

Fetch All Invoices
    [Documentation]    Fetches all invoices stored in MongoDB
    ${response}=    GET On Session    ${SESSION_NAME}    /api/invoices
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['invoices']}

Fetch System Stats
    [Documentation]    Fetches dashboard statistics
    ${response}=    GET On Session    ${SESSION_NAME}    /api/stats
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['stats']}

Process Single PDF Invoice
    [Arguments]    ${filename}=Acme_Single_Invoice.pdf
    [Documentation]    Triggers ingestion engine for a single PDF file
    ${payload}=    Generate Mock Invoice Payload    SINGLE_PDF    ${filename}
    ${response}=    POST On Session    ${SESSION_NAME}    /api/process    json=${payload}
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['processed']}

Process Multiple PDF Batch
    [Arguments]    ${filename}=GlobalLogistics_Batch.pdf
    [Documentation]    Triggers ingestion engine for multiple PDF batch
    ${payload}=    Generate Mock Invoice Payload    MULTIPLE_PDF    ${filename}
    ${response}=    POST On Session    ${SESSION_NAME}    /api/process    json=${payload}
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['processed']}

Process Dataset CSV
    [Arguments]    ${filename}=Vendor_Dataset.csv
    [Documentation]    Triggers ingestion engine for CSV dataset
    ${payload}=    Generate Mock Invoice Payload    DATASET_CSV    ${filename}
    ${response}=    POST On Session    ${SESSION_NAME}    /api/process    json=${payload}
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['processed']}

Approve Invoice By ID
    [Arguments]    ${invoice_id}    ${notes}=Approved by Robot RPA
    [Documentation]    Submits manager approval decision for an invoice
    ${body}=    Create Dictionary    id=${invoice_id}    notes=${notes}
    ${response}=    POST On Session    ${SESSION_NAME}    /api/approve    json=${body}
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['invoice']}

Reject Invoice By ID
    [Arguments]    ${invoice_id}    ${reason}=Rejected by Robot RPA
    [Documentation]    Submits manager rejection decision for an invoice
    ${body}=    Create Dictionary    id=${invoice_id}    reason=${reason}
    ${response}=    POST On Session    ${SESSION_NAME}    /api/reject    json=${body}
    Status Should Be    200    ${response}
    Should Be True    ${response.json()['success']}
    RETURN    ${response.json()['invoice']}

Verify Invoice Status
    [Arguments]    ${invoice_id}    ${expected_status}
    [Documentation]    Verifies that specific invoice ID has expected status in database
    ${invoices}=    Fetch All Invoices
    FOR    ${inv}    IN    @{invoices}
        IF    '${inv["id"]}' == '${invoice_id}'
            Should Be Equal As Strings    ${inv["status"]}    ${expected_status}
            RETURN    True
        END
    END
    Fail    Invoice ID ${invoice_id} not found in MongoDB store
