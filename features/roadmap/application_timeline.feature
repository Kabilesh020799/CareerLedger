@roadmap @timeline
Feature: Track an application's event history
  As a job seeker
  I want a chronological application timeline
  So that I can understand everything that happened during the process

  Scenario: Record an application event
    Given an application exists
    When I add an event with a type, description, and occurrence date
    Then the event should appear in that application's timeline

  Scenario: Change status and create an event atomically
    Given an application has status "APPLIED"
    When its status changes to "INTERVIEW"
    Then the application status should be "INTERVIEW"
    And a corresponding status event should exist
    And both changes should succeed or fail together

  Scenario: Delete events with their application
    Given an application has timeline events
    When the application is deleted
    Then its timeline events should also be deleted
