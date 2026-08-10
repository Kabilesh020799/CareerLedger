@v0.1 @api @ui @dashboard
Feature: Understand the current application pipeline
  As a job seeker
  I want a dashboard of useful application metrics
  So that I can see my current progress and where opportunities are converting

  Scenario: See actionable work before analytics
    Given I have reminders or inactive applications requiring attention
    When I open the dashboard
    Then overdue and upcoming work should appear before pipeline analytics

  Scenario: View current application totals
    Given I own applications with different statuses
    When I open the dashboard
    Then I should see my total applications
    And I should see current totals for interviews and offers
    And I should see the number of applications created since Monday

  Scenario: View current pipeline conversion rates
    Given I own submitted applications across the pipeline
    When I open the dashboard
    Then the screening rate should use submitted applications currently at screening, assessment, interview, or offer
    And the interview rate should use submitted applications currently at interview or offer
    And the offer rate should use submitted applications currently at offer

  Scenario: Show zero rates without submitted applications
    Given I only own saved applications
    When I open the dashboard
    Then every pipeline conversion rate should be zero

  Scenario: Keep dashboard metrics private
    Given another user owns applications
    When I request my dashboard summary
    Then the other user's applications should not affect my totals or rates

  Scenario: Refresh metrics after an application changes
    Given I have loaded my dashboard summary
    When I create, update, move, or delete an application
    Then my dashboard summary should be refreshed

  Scenario: View an empty dashboard
    Given I do not own any applications
    When I open the dashboard
    Then every metric should show zero
    And I should be able to create my first application

  Scenario: Retry a dashboard loading failure
    When my dashboard summary cannot be loaded
    Then I should see a dashboard error
    And I should be able to retry loading it
