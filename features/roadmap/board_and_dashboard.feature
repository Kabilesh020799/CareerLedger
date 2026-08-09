@roadmap @ui
Feature: Understand job-search outcomes
  As a job seeker
  I want a dashboard of useful metrics
  So that I can understand my pipeline and strategy

  Scenario: View useful dashboard metrics
    Given applications exist with different statuses and dates
    When I open the dashboard
    Then I should see totals for applications, screenings, assessments, interviews, offers, and rejections
    And I should see the number of applications created this week

  Scenario: Compare job-search strategies
    Given applications contain source and resume information
    When I view strategy analytics
    Then I should see response, interview, and offer rates
    And I should be able to compare outcomes by source and resume
