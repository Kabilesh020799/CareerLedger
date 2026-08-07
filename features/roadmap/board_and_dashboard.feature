@roadmap @ui
Feature: Visualize job-search progress
  As a job seeker
  I want board and dashboard views
  So that I can understand my pipeline and strategy

  Scenario: View applications on a Kanban board
    Given applications exist in multiple statuses
    When I open the board
    Then each application should appear in its current status column

  Scenario: Move an application between board columns
    Given an application is in the "APPLIED" column
    When I move it to the "INTERVIEW" column
    Then the backend should change its status to "INTERVIEW"
    And a status-change timeline event should be created

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
