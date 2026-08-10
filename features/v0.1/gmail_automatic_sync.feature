@v0.1 @gmail @worker
Feature: Automatically synchronize Gmail
  As a job seeker
  I want Gmail checked on a schedule
  So that new recruitment updates reach my review queue without manual work

  Scenario: Enable automatic synchronization
    Given my Gmail account is connected
    When I enable automatic synchronization with a supported interval
    Then the schedule should be saved for my account
    And the next synchronization should be queued for that interval

  Scenario: Process only new Gmail history
    Given automatic synchronization has previously completed
    When the next scheduled synchronization runs
    Then Gmail should be queried from the last successful history cursor
    And duplicate message references should not be stored

  Scenario: Retry a temporary synchronization failure
    Given a scheduled Gmail synchronization encounters a temporary failure
    When the worker handles the failure
    Then the job should retry with exponential backoff
    And the last successful synchronization cursor should remain unchanged

  Scenario: Disable automatic synchronization
    Given automatic Gmail synchronization is enabled
    When I disable automatic synchronization
    Then no future synchronization should remain scheduled for my account
