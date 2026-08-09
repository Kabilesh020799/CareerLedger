@v0.1 @api @ui @dashboard
Feature: Compare application sources
  As a job seeker
  I want to compare application outcomes by source
  So that I can focus on sources that produce stronger opportunities

  Scenario: Compare outcomes across application sources
    Given I own submitted applications with source information
    When I open the dashboard
    Then I should see submitted application counts by source
    And I should see response, interview, and offer counts and rates for each source

  Scenario: Use each source's submitted applications as its denominator
    Given a source has saved and submitted applications
    When I view its outcome rates
    Then saved applications should be excluded from the denominator
    And the displayed denominator should be the submitted applications for that source

  Scenario: Define current source outcomes consistently
    Given I own submitted applications at different current statuses
    When source outcomes are calculated
    Then response outcomes should include screening, assessment, interview, offer, and rejected applications
    And interview outcomes should include interview and offer applications
    And offer outcomes should include offer applications

  Scenario: Combine equivalent source names
    Given I own applications whose source names differ only by case or surrounding whitespace
    When I view source analytics
    Then those applications should appear in one source comparison

  Scenario: Exclude applications without a source
    Given I own applications with blank or missing source information
    When I view source analytics
    Then those applications should not appear in a source comparison

  Scenario: Show unavailable rates for a source without submissions
    Given a source is used only by saved applications
    When I view source analytics
    Then its submitted application count should be zero
    And its response, interview, and offer rates should be unavailable

  Scenario: Keep source analytics private
    Given another user owns applications with source information
    When I request my dashboard summary
    Then the other user's applications should not affect my source counts or rates

  Scenario: View an empty source comparison
    Given I do not own any applications with source information
    When I open the dashboard
    Then I should see that no source outcome data is available
    And I should be able to create an application
