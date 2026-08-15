@v0.1 @api @ui @admin
Feature: Review user accounts as an administrator
  As an authorized administrator
  I want to review account summaries
  So that I can understand account adoption without opening private user data

  Scenario: List account summaries
    Given my application login email is configured as an administrator
    When I open the user account dashboard
    Then I should see aggregate account totals
    And I should see paginated user identity, verification, authentication, signup, application, and workspace details
    And I should not see credentials, sessions, tokens, or private application content

  Scenario: Search account summaries
    Given I am viewing the user account dashboard
    When I search by a user's name, username, or email
    Then I should see only matching paginated account summaries

  Scenario: Reject a regular account
    Given my application login email is not configured as an administrator
    When I request the user account dashboard or its API
    Then the administrator navigation should not be shown
    And the API should reject the request without returning account metadata

  Scenario: Use the first demo account as the default administrator
    Given no administrator account emails are configured
    And a demo identity is configured through the environment
    When the first configured demo account requests account summaries
    Then the administrator dashboard should be available
    And another signed-in account should still be rejected

  Scenario: Prevent public creation of administrator accounts
    Given an email is reserved for administrator access
    When a visitor tries to sign up with that email using password or Google authentication
    Then the application should not create the administrator account
    And the response should not reveal whether the email is administrator-reserved
