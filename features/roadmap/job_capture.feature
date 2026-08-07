@roadmap @browser-extension
Feature: Preserve job posting information
  As a job seeker
  I want to capture job postings before they disappear
  So that I can review the original opportunity later

  Scenario: Save a posting from the browser extension
    Given I am viewing a job posting
    When I save it with the browser extension
    Then company, job title, location, URL, and description should be proposed
    And I should be able to confirm the application before saving it

  Scenario: Store a job description snapshot
    When I save a job posting
    Then its description and original URL should be stored
    And its capture date should be recorded

  Scenario: Retain structured posting details
    Given a saved job description
    When posting details are extracted
    Then skills, experience requirement, salary, location, and work mode should be retained when available
