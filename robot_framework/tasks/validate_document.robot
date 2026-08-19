*** Settings ***
Documentation    Dedicated Document Validation Robot Workflow
Resource         ../resources/common.resource
Resource         ../resources/logging.resource
Library          ../libraries/InvoiceLibrary.py
Library          ../libraries/DatasetLibrary.py

*** Tasks ***
Execute Document Validation Workflow
    [Documentation]    Specialized Document Integrity & Arithmetic Validation Workflow
    Log Automation Execution Step    Starting Document Validation Robot...
    
    Validate Invoice Totals    100.00    10.00    110.00    0.0
    Log Automation Execution Step    Invoice Total Validation Passed.
