*** Settings ***
Documentation    Dedicated Invoice Processing Robot Workflow
Resource         ../resources/common.resource
Resource         ../resources/duplicate.resource
Resource         ../resources/invoice.resource
Resource         ../resources/mongodb.resource
Resource         ../resources/logging.resource
Library          ../libraries/InvoiceLibrary.py
Library          ../libraries/DatabaseLibrary.py

*** Variables ***
&{INVOICE_PAYLOAD}=    &{EMPTY}

*** Tasks ***
Execute Invoice Processing Robot Workflow
    [Documentation]    Extract PDF/Excel/CSV -> Call AI Model -> Normalize -> Validate Fields -> Score Confidence -> Duplicate Check -> Save MongoDB
    Log Automation Execution Step    Starting Invoice Processing Robot...
    
    ${invoice_dict}=    Set Variable If    ${INVOICE_PAYLOAD} != &{EMPTY}    ${INVOICE_PAYLOAD}    ${EMPTY}
    IF    $invoice_dict == ''
        ${invoice_dict}=    Generate Mock Invoice Payload    SINGLE_PDF    Demo_Invoice.pdf
    END
    
    ${val_result}=      Validate Invoice Fields Integrity    ${invoice_dict}
    ${score}=           Calculate Invoice Confidence Score   ${invoice_dict}
    ${status}=          Determine Invoice Status             ${score}    ${val_result}
    
    Set To Dictionary    ${invoice_dict}    status=${status}
    Set To Dictionary    ${invoice_dict}    confidenceScore=${score}
    Set To Dictionary    ${invoice_dict}    validation=${val_result}
    
    # Run Duplicate Invoice Detection Robot on real normalized invoice data
    ${invoice_dict}=    Run Duplicate Invoice Detection Robot    ${invoice_dict}
    
    Log Automation Execution Step    Invoice Processing Robot Completed. Status: ${invoice_dict['status']} | Confidence: ${score}
