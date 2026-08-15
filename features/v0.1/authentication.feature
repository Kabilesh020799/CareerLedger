@v0.1 @security @authentication
Feature: Secure user-owned application data
  As a job seeker
  I want to sign in before using the tracker
  So that my job-search records remain private

  Scenario: Create a password account
    Given password authentication is enabled
    When I sign up with a unique username, email, and a valid password
    Then my password should be stored only as a bcrypt hash
    And I should have an authenticated application session
    And I should enter my private application workspace
    And the workspace should initially contain no applications

  Scenario: Validate password account details
    Given password authentication is enabled
    When I submit an invalid username, email, or password during signup
    Then the response status should be 400
    And no user account should be created

  Scenario: Reject a duplicate password account
    Given a user already owns the submitted username or email
    When I submit the signup form
    Then the response status should be 409
    And database implementation details should not be exposed

  Scenario: Temporarily limit abusive signup attempts
    Given password authentication is enabled
    And an account or network address has exceeded its signup attempt limit
    When another account signup is attempted
    Then the response status should be 429
    And signup limits should not consume password-login allowances

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

  Scenario: Bootstrap separate production demo accounts
    Given production user bootstrap is enabled
    When the backend starts
    Then both documented demo accounts should exist
    And each account should have separate user-owned data

  Scenario: Reject incorrect demo credentials
    Given the development demo login is enabled
    When I sign in with an incorrect username or password
    Then the response status should be 401
    And the response should not identify which credential was incorrect

  Scenario: Slow repeated password attempts
    Given password login is enabled
    When repeated login attempts use the same account or network address
    Then later attempts should be progressively delayed
    And temporary attempt limits should be tracked in private Redis storage

  Scenario: Temporarily block abusive password attempts
    Given an account or network address has exceeded its login attempt limit
    When another password login is attempted
    Then the response status should be 429
    And the response should state when another attempt may be made
    And security logs should contain only opaque account and network references

  Scenario: Do not count successful sign-ins as network abuse
    Given password login is enabled
    When valid users sign in repeatedly from the same network address
    Then successful sign-ins should not exhaust the network attempt limit
    And failed attempts from that network should remain counted

  Scenario: Avoid an authentication outage when protection storage fails
    Given password login protection cannot reach Redis
    When valid credentials are submitted
    Then normal authentication should remain available
    And a sanitized protection-unavailable event should be logged

  Scenario: Sign in to the production HTTP deployment
    Given password login is enabled in production
    And a demo identity was configured through the production environment
    When I sign in with that configured username and password
    Then I should have an authenticated application session
    And the login page should warn that HTTP does not protect credentials in transit

  Scenario: Do not seed demo application records in production
    Given the application is running in production
    When the database bootstrap runs
    Then only environment-configured demo users should be created
    But demo applications should not be seeded

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
