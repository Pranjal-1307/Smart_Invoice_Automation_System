*** Settings ***
Documentation    Common Global Resources, Variables, and Setup Keywords for Robot Framework RPA Engine
Library          Collections
Library          String
Library          ../libraries/DocumentLibrary.py
Library          ../libraries/DatabaseLibrary.py

*** Variables ***
${BASE_URL}             http://localhost:3000
${DEFAULT_CONF_THRES}   0.90
${ROBOT_ENGINE_NAME}   Robot Framework RPA Orchestration Layer

*** Keywords ***
Start Robot Automation Workflow
    [Arguments]    ${file_name}=${EMPTY}
    [Documentation]    Initializes automation context and logs run start
    Log    🤖 [ROBOT FRAMEWORK] Starting RPA Orchestration Workflow for: ${file_name}    console=True
