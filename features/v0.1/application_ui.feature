@v0.1 @ui @applications
Feature: Manage applications in the React interface
  As a job seeker
  I want to manage applications from the browser
  So that I do not need to call the API directly

  Scenario: Navigate the application workspace
    Given I open the application
    Then I should see the primary application navigation
    When I choose to view applications
    Then I should arrive at the applications page

  Scenario: Understand the workspace navigation
    Given I am signed in
    When I open the primary navigation
    Then destinations should be grouped by workspace, applications, documents, automation, and settings
    And pending email updates should be visible beside email sync

  Scenario: Open an unknown page
    When I open an unknown frontend route
    Then I should see a page-not-found message
    And I should be able to return to the applications page

  Scenario: View the applications table
    Given applications exist
    When I open the applications page
    Then I should see columns for company, position, status, applied date, source, and actions
    And each application should appear in the table

  Scenario: View applications on a phone
    Given applications exist
    And I am using a narrow phone screen
    When I open the applications page
    Then each application should appear as a readable card
    And I should be able to open the application without horizontally scrolling a table

  Scenario: Reveal filters on a phone
    Given I am using a narrow phone screen
    When I open the applications page
    Then advanced discovery controls should remain collapsed
    And I should be able to reveal and apply them with the filters control

  Scenario: Reveal less common discovery filters
    Given I am viewing the application discovery controls
    Then search, status, and sorting should remain immediately available
    And source, dates, order, and result count should remain collapsed until I request more filters

  Scenario: Display consistent application dropdowns
    Given I am filtering or editing applications
    Then each dropdown should open a custom accessible selection menu
    And each trigger should display a consistently aligned selection indicator
    And its selected value should remain readable

  Scenario: View an empty applications page
    Given no applications exist
    When I open the applications page
    Then I should see an empty state
    And I should be able to start creating an application

  Scenario: Create an application
    Given I am on the new application page
    When I submit valid application details
    Then the application should be saved
    And I should see the application in the interface

  Scenario: Show form validation errors
    Given I am on the new application page
    When I submit the form without required fields
    Then I should see validation messages for company and job title
    And no application should be created

  Scenario: Open application details
    Given an application exists
    When I select that application from the applications page
    Then I should see recorded application details grouped by overview, requirements, notes, and documents
    And missing optional sections should not distract from recorded information

  Scenario: Display a compact application status
    Given I am viewing an application with an applied status
    When the application details load
    Then the Applied status should appear as a compact title-case badge
    And the badge should not stretch across the details header

  Scenario: Take action from application details
    Given I am viewing an application
    When I change its status from the quick actions
    Then the status should be saved without opening the full edit form
    And I should be able to jump directly to adding a note or reminder

  Scenario: Confirm a completed action
    When I successfully create or update tracked work
    Then I should see a concise accessible confirmation

  Scenario: Edit an application
    Given I am viewing an application
    When I open the edit application page
    And I change its details and save
    Then the updated details should be displayed
    And the changes should remain after refreshing the page

  Scenario: Delete an application
    Given I am viewing an application
    When I request to delete the application
    Then I should be asked to confirm the deletion
    When I confirm that I want to delete it
    Then the application should no longer appear in the applications list

  Scenario: Display an API failure
    Given the backend cannot process requests
    When I open the applications page
    Then I should see an error state
    And I should be able to retry the request
