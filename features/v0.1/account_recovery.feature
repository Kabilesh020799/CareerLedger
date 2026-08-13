Feature: Account recovery and email verification
  Scenario: Request a password reset without exposing account existence
    When a visitor submits an email address for password recovery
    Then the application shows the same acknowledgement whether or not an eligible account exists

  Scenario: Reset a password with a valid one-time link
    Given a password user has an unexpired reset link
    When the user chooses a valid new password
    Then the password is changed
    And existing sessions for that user are revoked

  Scenario: Verify an account email
    Given a user has an unexpired email verification link
    When the user opens the link
    Then the email is marked as verified
    And the link cannot be used again

  Scenario: Continue without email delivery configured
    Given SMTP email delivery is not configured
    When a visitor requests password recovery or verification
    Then the application returns a safe acknowledgement without failing
