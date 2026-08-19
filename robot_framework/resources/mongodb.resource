*** Settings ***
Documentation    MongoDB Database Integration Keywords for Robot Framework
Library          ../libraries/DatabaseLibrary.py

*** Keywords ***
Save Processing Result To MongoDB
    [Arguments]    ${doc_result}
    [Documentation]    Persists RPA workflow document result into MongoDB
    ${doc_id}=    Store Document In MongoDB    ${doc_result}    invoices
    Write RPA Audit Log    ROBOT_RPA_DOC_STORED    Stored document ${doc_id} via Robot Framework RPA Engine
    RETURN    ${doc_id}

Update Processing Status In MongoDB
    [Arguments]    ${doc_id}    ${status}    ${reason}=Updated by Robot Framework
    [Documentation]    Updates processing status of document in MongoDB
    ${doc_data}=    Create Dictionary    id=${doc_id}    status=${status}    approvalReason=${reason}
    Store Document In MongoDB    ${doc_data}    invoices
