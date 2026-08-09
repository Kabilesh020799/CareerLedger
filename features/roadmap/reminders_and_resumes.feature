@roadmap
Feature: Compare resume strategy
  As a job seeker
  I want to track the resume used for each application
  So that I can learn what produces results

  Scenario: Record the resume used for an application
    Given multiple resume versions exist
    When I create or update an application
    Then I should be able to associate one resume version with it

  Scenario: Compare outcomes by resume
    Given applications reference different resume versions
    When I view resume analytics
    Then I should see application and interview counts for each resume version
