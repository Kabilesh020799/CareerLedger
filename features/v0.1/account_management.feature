Feature: Account management
  Scenario: Update the profile display name
    Given I am signed in
    When I save a valid display name on my profile
    Then my updated profile is displayed

  Scenario: Permanently delete a password account
    Given I am signed in with a password account
    When I confirm my exact email and current password
    Then my account and owned database records are deleted
    And my sessions are revoked
    And stored resume objects are queued for deletion

  Scenario: Reject incorrect deletion confirmation
    When I submit incorrect account confirmation
    Then my account remains available
    And a generic confirmation error is shown
