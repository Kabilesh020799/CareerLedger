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
    Then the request should be accepted without waiting for Gmail or the LLM provider
    And I should see that synchronization is queued or running
    When the background synchronization completes
    Then the most recent message references should be stored
    And the current Gmail history identifier should be recorded
    And the successful synchronization time should be shown

  Scenario: Avoid duplicate manual synchronization jobs
    Given my manual Gmail synchronization is queued or running
    When I request another Gmail synchronization
    Then the existing synchronization job should be returned
    And a duplicate synchronization job should not be created

  Scenario: Keep synchronization job status private
    Given another user has a manual Gmail synchronization job
    When I request that job's status
    Then the job should be reported as not found
    And provider failure details should never be returned

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

  Scenario: Classify an ambiguous recruitment message with an LLM fallback
    Given deterministic rules cannot classify a synchronized Gmail message
    And the optional LLM classifier is configured
    When the LLM returns a valid structured classification that meets the configured confidence threshold
    Then a pending Gmail review should be suggested from the validated classification
    And the raw LLM response should not update an application directly

  Scenario: Restrict the LLM fallback to selected accounts
    Given the optional LLM classifier is configured for selected account emails
    And my application login email is not selected
    When Gmail synchronization processes an ambiguous message
    Then the message metadata should not be sent to the LLM
    And synchronization should continue with deterministic classification

  Scenario: Continue synchronization when the LLM fallback is not configured
    Given deterministic rules cannot classify a synchronized Gmail message
    And the optional LLM classifier is not configured
    When Gmail synchronization processes the message
    Then synchronization should continue without creating a suggestion for that message
    And deterministic classifications for other messages should be preserved

  Scenario: Ignore an unusable LLM fallback result
    Given deterministic rules cannot classify a synchronized Gmail message
    And the optional LLM classifier is configured
    When the provider fails or returns an invalid or insufficiently confident result
    Then synchronization should continue without creating a suggestion for that message
    And no application should be changed

  Scenario: Bound LLM fallback processing time
    Given several synchronized Gmail messages require the optional LLM fallback
    When the background synchronization classifies those messages
    Then a limited number of classifications should run concurrently
    And the manual API request should remain independent of provider response time
