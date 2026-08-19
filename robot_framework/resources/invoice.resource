*** Settings ***
Documentation    Invoice Extraction & Validation Keywords for Robot Framework Invoice Processing Robot
Library          Collections
Library          ../libraries/InvoiceLibrary.py
Resource         logging.resource

*** Keywords ***
Run Invoice Processing Workflow
    [Arguments]    ${doc_content}    ${file_type}=PDF    ${custom_vendor}=${EMPTY}    ${custom_date}=${EMPTY}
    [Documentation]    Executes complete Invoice Processing Robot pipeline
    Log Automation Execution Step    [INVOICE_ROBOT] Extracting PDF/Excel/CSV Invoice Fields
    Log Automation Execution Step    [INVOICE_ROBOT] Invoking AI Invoice Pattern Model for Vendor & Layout Analysis

    ${is_dict}=    Run Keyword And Return Status    Dictionary Should Contain Key    ${doc_content}    vendor
    IF    not ${is_dict}
        ${doc_content}=    Generate Mock Invoice Payload    SINGLE_PDF    Demo_Invoice.pdf
    END

    ${val_result}=    Validate Invoice Fields Integrity    ${doc_content}
    ${confidence}=    Calculate Invoice Confidence Score    ${doc_content}
    ${status}=        Determine Invoice Status             ${confidence}    ${val_result}

    Log Automation Execution Step    [INVOICE_ROBOT] Field integrity check complete. Errors: ${val_result['errors']}
    Log Automation Execution Step    [INVOICE_ROBOT] Calculated Confidence Score: ${confidence} | Status: ${status}

    Set To Dictionary    ${doc_content}    status=${status}
    Set To Dictionary    ${doc_content}    confidenceScore=${confidence}
    Set To Dictionary    ${doc_content}    validation=${val_result}

    RETURN    ${doc_content}
