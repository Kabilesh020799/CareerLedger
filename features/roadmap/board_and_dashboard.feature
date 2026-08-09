@roadmap @ui @dashboard
Feature: Compare application sources
  As a job seeker
  I want to compare application outcomes by source
  So that I can learn where successful opportunities originate

  Scenario: Compare outcomes by source
    Given applications contain source information
    When I view source analytics
    Then I should see response, interview, and offer rates
    And I should be able to compare outcomes across application sources
