@v0.1 @security @authentication
Feature: Secure user-owned application data
  As a job seeker
  I want to sign in before using the tracker
  So that my job-search records remain private

  Scenario: Sign in with Google
    Given Google authentication is configured
    When I complete Google authentication successfully
    Then I should be redirected to the application
    And I should have an authenticated application session
    And Google OAuth tokens should not be exposed to the browser application

  Scenario: Sign in with the local demo account
    Given the development demo login is enabled
    And the demo user has been seeded
    When I sign in with the documented demo username and password
    Then I should have an authenticated application session
    And I should see applications owned by the demo user

  Scenario: Reject incorrect demo credentials
    Given the development demo login is enabled
    When I sign in with an incorrect username or password
    Then the response status should be 401
    And the response should not identify which credential was incorrect

  Scenario: Disable demo login in production
    Given the application is running in production
    When I try to sign in with demo credentials
    Then demo sign-in should be unavailable

  Scenario: Report the current signed-in user
    Given I am authenticated
    When I request my session
    Then my public profile should be returned

  Scenario: Sign out
    Given I am authenticated
    When I sign out
    Then my application session should be invalidated
    And protected requests from that session should be rejected

  Scenario: Reject an unauthenticated application request
    Given I am not authenticated
    When I request applications
    Then the response status should be 401

  Scenario: List only my applications
    Given I am authenticated
    And applications belong to multiple users
    When I request applications
    Then only applications owned by me should be returned

  Scenario: Assign a new application to its creator
    Given I am authenticated
    When I create an application
    Then the application should be owned by me

  Scenario Outline: Hide another user's application
    Given I am authenticated as one user
    And an application belongs to another user
    When I try to <action> that application
    Then the response status should be 404

    Examples:
      | action |
      | read   |
      | update |
      | delete |

  Scenario: Do not expose legacy unowned data
    Given I am authenticated
    And an application has no owner
    When I request applications
    Then the unowned application should not be returned

  Scenario: Fail closed when Google authentication is unavailable
    Given Google authentication is not configured
    When I try to sign in
    Then sign-in should be unavailable
    And application data should remain protected
