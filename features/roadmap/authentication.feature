@roadmap @security @authentication
Feature: Secure user-owned application data
  As a user
  I want to authenticate with Google
  So that only I can access my job-search records

  Scenario: Sign in with Google
    When I complete Google authentication successfully
    Then I should have an authenticated application session
    And OAuth tokens should not be exposed to the React client

  Scenario: Access my applications
    Given I am authenticated
    When I request applications
    Then only applications owned by me should be returned

  Scenario: Prevent cross-user access
    Given I am authenticated as one user
    And an application belongs to another user
    When I try to read, update, or delete that application
    Then access should be denied

  Scenario: Reject an unauthenticated request
    Given I am not authenticated
    When I request a protected resource
    Then the response status should be 401
