*** Settings ***
Documentation    Automated API Test Suite for Smart Invoice Automation System
Resource         resources/invoice_keywords.resource
Suite Setup      Connect To Invoice Server

*** Test Cases ***
Verify Initial Server State and Dashboard Stats
    [Documentation]    Ensures backend server responds and returns stats
    ${stats}=    Fetch System Stats
    Should Be True    ${stats['totalInvoices']} >= 0

Test Ingest Single PDF Invoice Endpoint
    [Documentation]    Validates single PDF ingestion API
    ${processed}=    Process Single PDF Invoice    Test_Single_Invoice.pdf
    Length Should Be    ${processed}    1
    ${inv}=    Get From List    ${processed}    0
    Should Be Equal As Strings    ${inv['filename']}    Test_Single_Invoice.pdf
    Validate Invoice Totals    ${inv['subtotal']}    ${inv['tax']}    ${inv['total']}

Test Ingest Multiple PDF Batch Endpoint
    [Documentation]    Validates batch PDF ingestion API
    ${processed}=    Process Multiple PDF Batch    Batch_Test_001.pdf
    Should Be True    len(${processed}) >= 2
    FOR    ${inv}    IN    @{processed}
        Validate Invoice Totals    ${inv['subtotal']}    ${inv['tax']}    ${inv['total']}
    END

Test Ingest Dataset CSV Endpoint
    [Documentation]    Validates CSV dataset ingestion API
    ${processed}=    Process Dataset CSV    Invoice_Dataset_Q3.csv
    Length Should Be    ${processed}    1
    ${inv}=    Get From List    ${processed}    0
    Should Be Equal As Strings    ${inv['filename']}    Invoice_Dataset_Q3.csv

Test Manager Approval Workflow
    [Documentation]    Validates manual approval process
    ${processed}=    Process Single PDF Invoice    Approval_Target.pdf
    ${inv}=    Get From List    ${processed}    0
    ${inv_id}=    Set Variable    ${inv['id']}
    
    ${approved_inv}=    Approve Invoice By ID    ${inv_id}    Approved via Robot Test Suite
    Should Be Equal As Strings    ${approved_inv['status']}    APPROVED
    Verify Invoice Status    ${inv_id}    APPROVED

Test Manager Rejection Workflow
    [Documentation]    Validates manual rejection process
    ${processed}=    Process Single PDF Invoice    Rejection_Target.pdf
    ${inv}=    Get From List    ${processed}    0
    ${inv_id}=    Set Variable    ${inv['id']}

    ${rejected_inv}=    Reject Invoice By ID    ${inv_id}    Flagged as Duplicate
    Should Be Equal As Strings    ${rejected_inv['status']}    REJECTED
    Verify Invoice Status    ${inv_id}    REJECTED

Test System Reset Endpoint
    [Documentation]    Validates database purge functionality
    Reset Database State
    ${invoices}=    Fetch All Invoices
    Length Should Be    ${invoices}    0
    ${stats}=    Fetch System Stats
    Should Be Equal As Integers    ${stats['totalInvoices']}    0
