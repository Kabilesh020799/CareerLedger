@v0.1 @ui @applications
Feature: Manage applications on a status board
  As a job seeker
  I want to view and move applications between status columns
  So that I can understand and update my pipeline quickly

  Scenario: View applications on the board
    Given I own applications in multiple statuses
    When I open the application board
    Then each application should appear in its current status column
    And each status column should show its application count

  Scenario: Open an application from the board
    Given I am viewing an application card on the board
    When I open the application
    Then I should see that application's details

  Scenario: Move an application by dragging it
    Given I own an application in the "APPLIED" column
    When I drag it to the "INTERVIEW" column
    Then the full application card should follow my pointer while dragging
    And it should immediately appear in the "INTERVIEW" column
    And the backend should change its status to "INTERVIEW"
    And a status-change timeline event should be created

  Scenario: Move an application without dragging
    Given I own an application in the "APPLIED" column
    When I choose "INTERVIEW" from the card's status control
    Then the application should move to the "INTERVIEW" column
    And the backend should change its status to "INTERVIEW"

  Scenario: Restore a card when moving it fails
    Given I own an application in the "APPLIED" column
    When I try to move it to the "INTERVIEW" column and the update fails
    Then it should return to the "APPLIED" column
    And I should see an update error

  Scenario: View an empty board
    Given I do not own any applications
    When I open the application board
    Then I should see an empty state
    And I should be able to create my first application

  Scenario: Handle a board loading failure
    When my applications cannot be loaded on the board
    Then I should see a board error
    And I should be able to retry loading it
