@v0.1 @api @ui @sprints
Feature: Carry applications between job-search sprints
  As a job seeker
  I want to work in time-boxed sprints
  So that unfinished applications stay visible while completed outcomes are archived

  Scenario: Start the first sprint with existing applications
    Given I own applications that are not assigned to a sprint
    When I start a sprint
    Then the sprint should become active
    And the existing applications should appear in the active sprint

  Scenario: Carry unfinished applications into the next sprint
    Given I have an active sprint with an applied application and a rejected application
    When I start a new sprint
    Then the previous sprint should be closed
    And the rejected application should remain in the closed sprint
    And the applied application should appear in the new active sprint
    And I should see how many applications carried over

  Scenario: Add a new application to the active sprint
    Given I have an active sprint
    When I create an application
    Then the application should appear in the active sprint
