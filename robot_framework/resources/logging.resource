*** Settings ***
Documentation    Logging & Summary Generator Keywords for Robot Framework RPA Engine

*** Keywords ***
Log Automation Execution Step
    [Arguments]    ${message}
    [Documentation]    Logs structured step message to console and report
    Log    🤖 [ROBOT ENGINE] ${message}    console=True

Generate Automation Log Summary
    [Arguments]    ${doc_type}    ${status}    ${confidence}
    [Documentation]    Generates execution log summary line
    ${log_str}=    Set Variable    Robot Framework RPA Orchestrated ${doc_type} Workflow -> Status: ${status} (Score: ${confidence})
    Log    ========================================================    console=True
    Log    ${log_str}                                                   console=True
    Log    ========================================================    console=True
    RETURN    ${log_str}
