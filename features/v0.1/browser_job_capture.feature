@v0.1 @browser-extension @api
Feature: Capture a job posting from the browser
  As a job seeker
  I want to review and save a posting before it disappears
  So that the original opportunity remains with my application

  Scenario: Review extracted posting details before saving
    Given I am viewing a job posting in a supported browser
    When I open the Job Tracker extension
    Then company, job title, location, URL, and description should be proposed
    And I should be able to edit every proposed field before confirming

  Scenario: Store a confirmed posting snapshot
    Given I have reviewed the proposed posting details
    When I confirm the capture
    Then a saved application should be created for my account
    And its description, original URL, and capture date should be retained

  Scenario: Authenticate capture access without sharing a login session
    Given I created a revocable browser-extension token in Job Tracker
    When the extension submits a capture with that token
    Then the application should belong to the token owner
    And the stored token value should not be recoverable from the database

  Scenario: Reject revoked extension access
    Given I revoked a browser-extension token
    When the extension submits another capture with that token
    Then the request should be rejected without creating an application
