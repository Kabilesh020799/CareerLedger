@v0.1 @api @ui @sprints
Feature: Carry applications between job-search sprints
  As a job seeker
  I want to work in time-boxed sprints
  So that unfinished applications stay visible while completed outcomes are archived

  Scenario: Start the first sprint with existing applications
    Given I own applications that are not assigned to a sprint
    When I configure and start a 14-day sprint
    Then the sprint should become active
    And the sprint should show its configured end date
    And the existing applications should appear in the active sprint

  Scenario: Keep a sprint active until its configured end
    Given I have an active sprint that ends in the future
    When I try to start a new sprint early
    Then the active sprint should remain unchanged
    And I should see when the current sprint can end

  Scenario: Carry unfinished applications into the next sprint after the end
    Given I have an active sprint with an applied application and a rejected application
    And the active sprint has reached its configured end
    When I configure and start a 21-day sprint
    Then the previous sprint should be closed
    And the new sprint should end 21 days after it starts
    And the rejected application should remain in the closed sprint
    And the applied application should appear in the new active sprint
    And I should see how many applications carried over

  Scenario: Notify me when the active sprint ends
    Given I have an active sprint that reaches its configured end
    When the sprint ends
    Then I should see an in-app notification that the sprint has ended
    And I should be prompted to start the next sprint manually

  Scenario: Review applications archived by a closed sprint
    Given a rejected application remains assigned to a closed sprint
    When I open Archived applications
    Then I should see the rejected job
    And it should be grouped under the sprint that closed it

  Scenario: Add a new application to the active sprint
    Given I have an active sprint
    When I create an application
    Then the application should appear in the active sprint
