@v0.1 @api @ui @dashboard
Feature: Compare outcomes across resume versions
  As a job seeker
  I want to compare outcomes across my resume versions
  So that I can learn which positioning produces progress

  Scenario: Compare submitted applications and milestone rates by resume
    Given my applications reference different resume versions
    When I view the dashboard
    Then I should see submitted application counts for each resume version
    And screening should include applications currently at screening, assessment, interview, or offer
    And interview should include applications currently at interview or offer
    And offer should include applications currently at offer
    And each milestone rate should use that resume version's submitted applications as its denominator

  Scenario: Exclude saved and unassigned applications from resume outcomes
    Given I have saved applications and applications without a resume version
    When I view resume outcomes
    Then saved applications should not count as submitted
    And applications without a resume version should not appear as a resume comparison

  Scenario: Show a resume version without submitted applications
    Given I own a resume version used only by saved applications
    When I view resume outcomes
    Then I should see that resume version with zero submitted applications
    And its milestone rates should be shown as unavailable

  Scenario: Keep resume outcomes private
    Given another user owns resume versions and associated applications
    When I view resume outcomes
    Then the other user's resume versions and applications should not affect my results

  Scenario: View resume outcomes before creating a resume version
    Given I do not own any resume versions
    When I view the dashboard
    Then I should see that resume outcome data is not available yet
    And I should be able to open resume version management
