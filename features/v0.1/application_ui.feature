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

  Scenario: Open an unknown page
    When I open an unknown frontend route
    Then I should see a page-not-found message
    And I should be able to return to the applications page

  Scenario: View the applications table
    Given applications exist
    When I open the applications page
    Then I should see columns for company, position, status, applied date, source, and actions
    And each application should appear in the table

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
    Then I should see all recorded application details

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
