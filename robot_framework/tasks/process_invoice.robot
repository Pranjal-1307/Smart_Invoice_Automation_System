*** Settings ***
Documentation    Dedicated Invoice Processing Robot Workflow
Resource         ../resources/common.resource
Resource         ../resources/invoice.resource
Resource         ../resources/mongodb.resource
Resource         ../resources/logging.resource
Library          ../libraries/InvoiceLibrary.py

*** Tasks ***
Execute Invoice Processing Robot Workflow
    [Documentation]    Extract PDF/Excel/CSV -> Call AI Model -> Normalize -> Validate Fields -> Score Confidence -> Save MongoDB
    Log Automation Execution Step    Starting Invoice Processing Robot...
    
    ${mock_payload}=    Generate Mock Invoice Payload    SINGLE_PDF    Demo_Invoice.pdf
    ${val_result}=      Validate Invoice Fields Integrity    ${mock_payload}
    ${score}=           Calculate Invoice Confidence Score   ${mock_payload}
    ${status}=          Determine Invoice Status             ${score}    ${val_result}
    
    Log Automation Execution Step    Invoice Processing Robot Completed. Status: ${status} | Confidence: ${score}
