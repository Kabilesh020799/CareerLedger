@v0.1 @api @ui @gmail
Feature: Manually synchronize Gmail
  As a job seeker
  I want to connect Gmail and fetch new message references on demand
  So that future recruitment processing can avoid reprocessing email

  Scenario: Connect Gmail with minimum access
    Given Gmail integration is configured
    When I choose to connect Gmail
    Then I should be sent to Google consent for read-only message metadata
    And offline access and a non-guessable state value should be requested

  Scenario: Reject an invalid authorization callback
    Given I started Gmail authorization
    When the callback state does not match my session
    Then my Gmail connection should not be saved
    And I should see that authorization failed

  Scenario: Store Gmail authorization privately
    Given I approve Gmail metadata access
    When Google returns authorization credentials
    Then the credentials should be encrypted before they are persisted
    And no access or refresh token should be returned to the browser

  Scenario: Perform the first manual synchronization
    Given I connected Gmail but have not synchronized it
    When I request a Gmail synchronization
    Then the most recent message references should be stored
    And the current Gmail history identifier should be recorded
    And the successful synchronization time should be shown

  Scenario: Synchronize incrementally
    Given a successful Gmail synchronization recorded a history identifier
    When I synchronize Gmail again
    Then only messages added after that history identifier should be requested
    And the newest returned history identifier should be recorded

  Scenario: Deduplicate synchronized messages
    Given Gmail returns a message that was stored previously
    When synchronization completes
    Then that Gmail message should not be stored twice
    And the result should distinguish new and duplicate messages

  Scenario: Recover from an expired history identifier
    Given Gmail no longer recognizes my saved history identifier
    When I synchronize Gmail
    Then a new initial synchronization should be performed
    And a fresh history identifier should be recorded

  Scenario: Preserve state when synchronization fails
    Given I have a previously successful Gmail synchronization
    When Gmail cannot complete the next synchronization
    Then my saved history identifier and last successful synchronization time should remain unchanged
    And I should be able to retry manually

  Scenario: Require a Gmail connection before synchronization
    Given I have not connected Gmail
    When I request a Gmail synchronization
    Then the request should be rejected without calling Gmail

  Scenario: Keep Gmail state private
    Given another user has connected and synchronized Gmail
    When I view my Gmail status or synchronize
    Then I should not see or use the other user's connection or message references

  Scenario: Disconnect Gmail
    Given I have connected and synchronized Gmail
    When I disconnect Gmail
    Then its stored credentials and synchronized message references should be deleted
    And my tracked applications should remain unchanged

  Scenario: Explain unavailable Gmail configuration
    Given Gmail integration is not configured
    When I open Gmail synchronization
    Then I should see that an administrator must configure it
    And I should not be offered a connection action
