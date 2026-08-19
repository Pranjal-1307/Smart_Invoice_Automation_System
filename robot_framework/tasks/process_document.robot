*** Settings ***
Documentation    Main Robot Framework RPA Orchestrator Workflow for Smart Invoice Automation System
Resource         ../resources/common.resource
Resource         ../resources/invoice.resource
Resource         ../resources/dataset.resource
Resource         ../resources/mongodb.resource
Resource         ../resources/logging.resource
Library          ../libraries/DocumentLibrary.py

*** Variables ***
${FILE_PATH}      ${EMPTY}
${FILE_NAME}      RPA_Document.pdf
${FILE_PAYLOAD}   ${EMPTY}

*** Tasks ***
Process Uploaded Document
    [Documentation]    Orchestrates end-to-end processing: receiving request, detecting file type, extracting content, document classification, workflow selection, validation, scoring, MongoDB storage, and automation logs.
    
    Start Robot Automation Workflow    ${FILE_NAME}
    
    ${file_type}=      Detect File Type From Payload    ${FILE_PAYLOAD}    ${FILE_NAME}
    Log Automation Execution Step    Detected File Type: ${file_type}
    
    ${doc_type}=       Classify Document Type           ${FILE_PAYLOAD}    ${file_type}    ${FILE_NAME}
    Log Automation Execution Step    Document Classified As: ${doc_type}
    
    IF    '${doc_type}' == 'INVOICE'
        Log Automation Execution Step    Selected Processing Workflow: Invoice Processing Robot
        ${result}=    Run Invoice Processing Workflow    ${FILE_PAYLOAD}    ${file_type}
    ELSE IF    '${doc_type}' == 'DATASET'
        Log Automation Execution Step    Selected Processing Workflow: Dataset Processing Robot
        ${result}=    Run Dataset Processing Workflow    ${FILE_PAYLOAD}    ${file_type}
    ELSE
        Log Automation Execution Step    Selected Processing Workflow: Unknown Document Handler
        ${result}=    Create Dictionary    status=UNKNOWN_DOCUMENT    confidenceScore=0.0
    END
    
    ${doc_id}=         Save Processing Result To MongoDB    ${result}
    Log Automation Execution Step    Stored Result in MongoDB with ID: ${doc_id}
    
    ${status_msg}=    Get From Dictionary    ${result}    status
    ${score}=         Get From Dictionary    ${result}    confidenceScore
    ${summary}=        Generate Automation Log Summary      ${doc_type}    ${status_msg}    ${score}
