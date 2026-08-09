@roadmap
Feature: Automate follow-ups and compare resume strategy
  As a job seeker
  I want automatic follow-up suggestions and resume tracking
  So that I receive proactive guidance and learn what produces results

  Scenario: Suggest a follow-up
    Given an application has status "APPLIED"
    And it has had no activity for more than 7 days
    And no follow-up has been recorded
    When reminders are evaluated
    Then a follow-up reminder should be suggested

  Scenario: Record the resume used for an application
    Given multiple resume versions exist
    When I create or update an application
    Then I should be able to associate one resume version with it

  Scenario: Compare outcomes by resume
    Given applications reference different resume versions
    When I view resume analytics
    Then I should see application and interview counts for each resume version
