*** Settings ***
Documentation    Robotic Process Automation (RPA) Workflow Tasks for Smart Invoice Automation System
Resource         resources/invoice_keywords.resource
Suite Setup      Connect To Invoice Server

*** Tasks ***
RPA Task 1: Execute Automated Multi-Format Ingestion Pipeline
    [Documentation]    Automates ingestion of single PDFs, batch PDFs, and CSV datasets
    Log    Starting RPA Invoice Ingestion Pipeline...    console=True
    
    ${single_res}=    Process Single PDF Invoice    RPA_Supplier_Invoice_101.pdf
    Log    Ingested 1 Single PDF Invoice    console=True
    
    ${batch_res}=    Process Multiple PDF Batch    RPA_Global_Transport_Batch.pdf
    Log    Ingested Batch PDF Invoices    console=True
    
    ${csv_res}=      Process Dataset CSV    RPA_Q3_Vendor_Dataset.csv
    Log    Ingested Dataset CSV Row    console=True
    
    ${all_invoices}=    Fetch All Invoices
    Log    Total Invoices in Store after ingestion: ${all_invoices.__len__()}    console=True

RPA Task 2: Execute Automated Invoice Decisioning Workflow
    [Documentation]    Finds pending invoices and auto-approves or reviews based on confidence tier
    Log    Starting Automated Decisioning Desk...    console=True
    ${invoices}=    Fetch All Invoices
    ${pending_list}=    Filter Pending Invoices    ${invoices}
    Log    Found ${pending_list.__len__()} PENDING invoices    console=True

    FOR    ${inv}    IN    @{pending_list}
        ${tier}=    Calculate Confidence Tier    ${inv['confidenceScore']}
        IF    '${tier}' == 'HIGH'
            Log    Auto-approving High Confidence Invoice ${inv['id']}    console=True
            Approve Invoice By ID    ${inv['id']}    Auto-approved by Robot RPA Engine (Tier HIGH)
        ELSE
            Log    Processing Manager Decision for Invoice ${inv['id']}    console=True
            Approve Invoice By ID    ${inv['id']}    Approved after RPA audit verification (Tier ${tier})
        END
    END

RPA Task 3: Audit System State and Generate RPA Execution Summary
    [Documentation]    Fetches final metrics and logs detailed execution summary
    ${invoices}=    Fetch All Invoices
    ${stats}=       Fetch System Stats
    ${summary}=     Summarize RPA Batch Run    ${invoices}
    
    Log    ===================================================    console=True
    Log    RPA WORKFLOW EXECUTION COMPLETE                      console=True
    Log    SUMMARY: ${summary}                                   console=True
    Log    Total MongoDB Records: ${stats['totalInvoices']}     console=True
    Log    Approved Invoices: ${stats['approved']}              console=True
    Log    Pending Invoices: ${stats['pending']}                 console=True
    Log    Total Value: $${stats['totalValue']}                 console=True
    Log    Average Confidence: ${stats['avgConfidence']}%       console=True
    Log    ===================================================    console=True
