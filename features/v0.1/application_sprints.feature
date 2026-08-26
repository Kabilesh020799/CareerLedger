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

  Scenario: Start the first sprint before scheduling future sprints
    Given I do not have an active sprint
    When I open the application board
    Then I should see the option to start my first sprint
    And I should not see the option to schedule a future sprint

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

  Scenario: Keep sprint-end guidance visible until the next action
    Given I have an active sprint that has reached its configured end
    When I open the application board
    Then I should see a persistent "Sprint ended" banner
    And the banner should prompt me to start the next sprint or review the upcoming timeline

  Scenario: Review applications archived by a closed sprint
    Given a rejected application remains assigned to a closed sprint
    When I open Archived applications
    Then I should see the rejected job
    And it should be grouped under the sprint that closed it

  Scenario: Schedule multiple upcoming sprints
    Given I have an active sprint
    When I schedule a 14-day sprint for a future date
    And I schedule a 21-day sprint after that sprint
    Then I should see both plans in the upcoming sprint timeline
    And each plan should show its scheduled start and end dates
    And the current sprint should remain active until I start a scheduled sprint

  Scenario: Schedule a whole-day sprint in my local timezone
    Given I have an active sprint and upcoming sprint plans
    When I open the schedule dialog
    Then the scheduled start should show my local timezone
    And the start date should default to the next available day after the planned sprint windows
    And the sprint should start at the beginning of the selected day

  Scenario: Start a scheduled sprint when it is due
    Given a scheduled sprint has reached its start date
    And the current sprint has reached its configured end
    When I start the scheduled sprint
    Then the scheduled sprint should become active
    And the previous sprint should be closed

  Scenario: Edit an upcoming sprint plan
    Given I have a scheduled sprint in the upcoming timeline
    When I change its name, duration, and scheduled start date
    Then the updated plan should appear in the upcoming sprint timeline
    And its planned end date should be recalculated
    And application assignments should remain unchanged

  Scenario: Cancel an upcoming sprint plan
    Given I have a scheduled sprint in the upcoming timeline
    When I cancel the scheduled sprint
    Then it should be removed from the upcoming sprint timeline
    And application assignments should remain unchanged

  Scenario: Find archived applications from navigation
    Given a rejected application remains assigned to a closed sprint
    When I open Archive from the primary navigation
    Then I should see the rejected job grouped under the sprint that closed it

  Scenario: Remember upcoming sprints from the dashboard
    Given I have scheduled upcoming sprints
    When I open the dashboard
    Then I should see the upcoming sprint names and planned dates
    And I should be able to open the sprint timeline from the dashboard

  Scenario: Add a new application to the active sprint
    Given I have an active sprint
    When I create an application
    Then the application should appear in the active sprint
