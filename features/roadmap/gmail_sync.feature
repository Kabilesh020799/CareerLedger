@roadmap @gmail
Feature: Automate recruitment update discovery from Gmail
  As a job seeker
  I want synchronization and uncertain classification handled automatically
  So that the review queue stays current with less manual effort

  Scenario: Use an LLM only as a validated fallback
    Given deterministic classification confidence is below the configured threshold
    When an LLM returns a structured classification
    Then the response should be validated before it is used
    And raw LLM output should never update an application directly

  Scenario: Synchronize Gmail on a schedule
    Given automatic synchronization is enabled
    When the synchronization interval elapses
    Then an asynchronous Gmail synchronization job should be queued
    And only messages newer than the last successful sync should be fetched
