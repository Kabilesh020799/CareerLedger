@v0.1 @browser-extension @api
Feature: Capture a job posting from the browser
  As a job seeker
  I want to review and save a posting before it disappears
  So that the original opportunity remains with my application

  Scenario: Review extracted posting details before saving
    Given I am viewing a job posting in a supported browser
    When I open the CareerLedger extension
    Then company, job title, location, URL, description, skills, experience, salary, and work mode should be proposed when available
    And I should be able to edit every proposed field before confirming

  Scenario: Keep connection setup separate from posting review
    Given I configured a valid browser-extension connection
    When I open the CareerLedger extension
    Then the connection settings should be collapsed
    And the posting review should identify required fields and provide clear loading, success, and error feedback
    And I should be able to read the current page again without reopening the extension

  Scenario: Store a confirmed posting snapshot
    Given I have reviewed the proposed posting details
    When I confirm the capture
    Then a saved application should be created for my account
    And its description, original URL, and capture date should be retained

  Scenario: Retain reviewed structured posting details
    Given a job posting provides skills, experience requirements, salary, location, and work mode
    When I review and confirm the extracted details
    Then those structured details should be stored with the application
    And I should see them on the application details page

  Scenario: Authenticate capture access without sharing a login session
    Given I created a revocable browser-extension token in CareerLedger
    When the extension submits a capture with that token
    Then the application should belong to the token owner
    And the stored token value should not be recoverable from the database

  Scenario: Reject revoked extension access
    Given I revoked a browser-extension token
    When the extension submits another capture with that token
    Then the request should be rejected without creating an application

  Scenario: Reject unsafe job URLs in extension captures
    Given I have reviewed a posting with a javascript or data URL
    When the extension submits the capture
    Then the request should be rejected without creating an application
