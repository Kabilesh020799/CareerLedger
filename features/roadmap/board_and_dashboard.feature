@roadmap @ui @dashboard
Feature: Compare job-search strategies
  As a job seeker
  I want to compare application outcomes by strategy
  So that I can improve future applications

  Scenario: Compare job-search strategies
    Given applications contain source and resume information
    When I view strategy analytics
    Then I should see response, interview, and offer rates
    And I should be able to compare outcomes by source and resume
