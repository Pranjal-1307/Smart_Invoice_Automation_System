*** Settings ***
Documentation    Dedicated Dataset Processing Robot Workflow
Resource         ../resources/common.resource
Resource         ../resources/dataset.resource
Resource         ../resources/mongodb.resource
Resource         ../resources/logging.resource
Library          ../libraries/DatasetLibrary.py

*** Tasks ***
Execute Dataset Processing Robot Workflow
    [Documentation]    Parse Dataset -> Detect Headers -> Validate Dataset Structure -> Check Columns -> Missing Values -> Quality Score -> Save MongoDB
    Log Automation Execution Step    Starting Dataset Processing Robot...
    
    ${sample_headers}=    Create List    RecordID    ItemName    Quantity    UnitPrice    Category
    ${row1}=              Create List    101         Widget A    10          15.50        Hardware
    ${row2}=              Create List    102         Widget B    5           25.00        Hardware
    ${sample_rows}=       Create List    ${row1}     ${row2}
    
    ${metrics}=    Validate Dataset Structure And Columns    ${sample_headers}    ${sample_rows}
    ${q_score}=    Calculate Data Quality Score           ${metrics}
    ${status}=     Determine Dataset Status               ${q_score}
    
    Log Automation Execution Step    Dataset Processing Robot Completed. Status: ${status} | Quality Score: ${q_score}
