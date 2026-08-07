@roadmap @gmail
Feature: Discover recruitment updates from Gmail
  As a job seeker
  I want recruitment emails converted into reviewable updates
  So that my tracker stays current with less manual effort

  Scenario: Manually synchronize Gmail
    Given I have connected my Gmail account
    When I request a Gmail synchronization
    Then new relevant messages should be fetched
    And previously processed messages should not be processed again
    And the last synchronization state should be recorded

  Scenario Outline: Classify recruitment email using deterministic rules
    Given an email contains <phrase>
    When the email is classified
    Then it should be recruitment-related
    And its detected status should be <status>

    Examples:
      | phrase                        | status     |
      | thank you for applying        | APPLIED    |
      | coding assessment             | ASSESSMENT |
      | schedule an interview         | INTERVIEW  |
      | we will not be moving forward | REJECTED   |
      | pleased to offer              | OFFER      |

  Scenario: Ignore an unrelated email
    Given an email is not recruitment-related
    When the email is classified
    Then no application update should be proposed

  Scenario: Match an email to an application
    Given a recruitment email and existing applications
    When company, job title, sender domain, date, and thread signals are scored
    Then the best match and its confidence should be proposed

  Scenario: Require review for an uncertain match
    Given an email match has insufficient confidence
    When classification finishes
    Then no application should be changed automatically
    And the update should be placed in the review queue

  Scenario: Confirm a detected update
    Given a detected update is waiting for review
    When I confirm the update
    Then the matched application should be updated
    And an application event should be recorded

  Scenario: Edit a detected update
    Given a detected update is waiting for review
    When I correct and confirm the detected information
    Then the corrected update should be applied

  Scenario: Ignore a detected update
    Given a detected update is waiting for review
    When I ignore the update
    Then no application should be changed

  Scenario: Suggest an application from an email
    Given a recruitment email describes an application that does not exist
    When email processing completes
    Then a new application suggestion should be shown
    But the application should not be created without confirmation

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
