@v0.1 @api @ui @dashboard
Feature: Compare outcomes across resume tags
  As a job seeker
  I want to compare outcomes across my resume tags
  So that I can learn which positioning produces progress

  Scenario: Compare submitted applications and milestone rates by resume
    Given my applications reference different resume tags
    When I view the dashboard
    Then I should see submitted application counts for each resume tag
    And screening should include applications currently at screening, assessment, interview, or offer
    And interview should include applications currently at interview or offer
    And offer should include applications currently at offer
    And each milestone rate should use that resume tag's submitted applications as its denominator

  Scenario: Exclude saved and unassigned applications from resume outcomes
    Given I have saved applications and applications without a resume tag
    When I view resume outcomes
    Then saved applications should not count as submitted
    And applications without a resume tag should not appear as a resume comparison

  Scenario: Show a resume tag without submitted applications
    Given I own a resume tag used only by saved applications
    When I view resume outcomes
    Then I should see that resume tag with zero submitted applications
    And its milestone rates should be shown as unavailable

  Scenario: Keep resume outcomes private
    Given another user owns resume tags and associated applications
    When I view resume outcomes
    Then the other user's resume tags and applications should not affect my results

  Scenario: View resume outcomes before creating a resume tag
    Given I do not own any resume tags
    When I view the dashboard
    Then I should see that resume outcome data is not available yet
    And I should be able to open resume tag management
