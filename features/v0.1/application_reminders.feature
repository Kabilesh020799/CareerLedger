@v0.1 @api @ui @reminders
Feature: Track application follow-ups and deadlines
  As a job seeker
  I want reminders attached to applications
  So that I can follow up and meet important deadlines

  Scenario Outline: Create an application reminder
    Given I own an application
    When I create a <type> reminder with a description and due date
    Then the reminder should appear on the application
    And it should be open

    Examples:
      | type      |
      | follow-up |
      | deadline  |

  Scenario: Reject an invalid reminder
    Given I own an application
    When I create a reminder without a description or valid due date
    Then the response status should be 400
    And no reminder should be created

  Scenario: Complete and reopen a reminder
    Given I own an open reminder
    When I mark the reminder complete
    Then it should show as completed
    When I reopen the reminder
    Then it should show as open again

  Scenario: Delete a reminder
    Given I own a reminder
    When I delete the reminder
    Then it should no longer appear on the application

  Scenario: Keep reminders private
    Given another user owns an application reminder
    When I list, update, or delete my reminders
    Then I should not see or change the other user's reminder

  Scenario: Show open reminders on the dashboard
    Given I own overdue and upcoming reminders
    When I open the dashboard
    Then overdue reminders should be identified separately from upcoming reminders
    And each reminder should link to its application
    And I should be able to complete a reminder

  Scenario: Show an empty reminder state
    Given I own an application without reminders
    When I open the application details
    Then I should see that no reminders exist

  Scenario: Remove reminders with their application
    Given I own an application with reminders
    When I delete the application
    Then its reminders should also be deleted

  Scenario: Suggest a follow-up for an inactive application
    Given I own an application with status "APPLIED"
    And its latest application or timeline activity was more than 7 days ago
    And it has no follow-up reminder
    When I open the dashboard
    Then the application should appear in suggested follow-ups
    And the suggestion should link to the application

  Scenario Outline: Do not suggest an ineligible follow-up
    Given I own an application that <condition>
    When I open the dashboard
    Then the application should not appear in suggested follow-ups

    Examples:
      | condition                                      |
      | does not have status "APPLIED"                |
      | has activity within the last 7 days            |
      | already has a follow-up reminder               |

  Scenario: Create a reminder from a follow-up suggestion
    Given I own an application with a follow-up suggestion
    When I add the suggested follow-up
    Then an open follow-up reminder due one day later should be created
    And the application should disappear from suggested follow-ups
