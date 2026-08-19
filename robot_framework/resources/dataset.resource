*** Settings ***
Documentation    Dataset Processing & Quality Score Keywords for Robot Framework Dataset Processing Robot
Library          Collections
Library          ../libraries/DatasetLibrary.py
Resource         logging.resource

*** Keywords ***
Run Dataset Processing Workflow
    [Arguments]    ${dataset_data}    ${file_type}=CSV
    [Documentation]    Executes Dataset Processing Robot pipeline for generic tabular datasets
    Log Automation Execution Step    [DATASET_ROBOT] Parsing Dataset Rows & Columns...
    Log Automation Execution Step    [DATASET_ROBOT] Detecting Table Headers & Column Layout...

    ${is_dict}=    Run Keyword And Return Status    Dictionary Should Contain Key    ${dataset_data}    headers
    IF    not ${is_dict}
        ${headers}=    Create List    RecordID    ItemName    Quantity    UnitPrice
        ${row1}=       Create List    101         Product A   10          20.00
        ${row2}=       Create List    102         Product B   5           50.00
        ${rows}=       Create List    ${row1}     ${row2}
        ${dataset_data}=    Create Dictionary    headers=${headers}    rows=${rows}
    ELSE
        ${headers}=    Get From Dictionary    ${dataset_data}    headers
        ${rows}=       Get From Dictionary    ${dataset_data}    rows
    END

    ${metrics}=    Validate Dataset Structure And Columns    ${headers}    ${rows}
    ${q_score}=    Calculate Data Quality Score           ${metrics}
    ${status}=     Determine Dataset Status               ${q_score}

    Log Automation Execution Step    [DATASET_ROBOT] Table check complete. Missing ratio: ${metrics['missingRatio']}
    Log Automation Execution Step    [DATASET_ROBOT] Calculated Quality Score: ${q_score} | Status: ${status}

    Set To Dictionary    ${dataset_data}    status=${status}
    Set To Dictionary    ${dataset_data}    confidenceScore=${q_score}
    Set To Dictionary    ${dataset_data}    qualityMetrics=${metrics}

    RETURN    ${dataset_data}
