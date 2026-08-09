@roadmap
Feature: Compare resume outcomes
  As a job seeker
  I want to compare outcomes across resume versions
  So that I can learn what produces results

  Scenario: Compare outcomes by resume
    Given applications reference different resume versions
    When I view resume analytics
    Then I should see application and interview counts for each resume version
