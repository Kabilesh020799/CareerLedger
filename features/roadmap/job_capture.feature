@roadmap @browser-extension
Feature: Preserve job posting information
  As a job seeker
  I want to capture job postings before they disappear
  So that I can review the original opportunity later

  Scenario: Retain structured posting details
    Given a saved job description
    When posting details are extracted
    Then skills, experience requirement, salary, location, and work mode should be retained when available
