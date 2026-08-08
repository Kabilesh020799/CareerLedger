@v0.1 @api @ui @timeline
Feature: Track an application's event history
  As a job seeker
  I want a chronological application timeline
  So that I can understand everything that happened during the process

  Scenario: View an empty application timeline
    Given I own an application with no events
    When I open that application's details
    Then I should see that no timeline activity has been recorded

  Scenario: Record a manual note
    Given I own an application
    When I add a note with a description and occurrence date
    Then the note should appear in that application's timeline
    And timeline entries should be ordered from newest to oldest

  Scenario: Reject an empty manual note
    Given I own an application
    When I try to add a note without a description
    Then the note should not be created
    And I should see a validation error

  Scenario: Change status and create an event atomically
    Given I own an application with status "APPLIED"
    When I change its status to "INTERVIEW"
    Then the application status should be "INTERVIEW"
    And a status-change event from "APPLIED" to "INTERVIEW" should exist
    And both changes should succeed or fail together

  Scenario: Do not record an event when status is unchanged
    Given I own an application with status "INTERVIEW"
    When I update it without changing its status
    Then no status-change event should be created

  Scenario: Keep another user's timeline private
    Given another user owns an application with timeline events
    When I request or add events for that application
    Then the application should be reported as not found
    And none of its timeline events should be exposed or changed

  Scenario: Delete events with their application
    Given I own an application with timeline events
    When I delete that application
    Then its timeline events should also be deleted
