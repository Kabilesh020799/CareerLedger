@v0.1 @api @ui @resumes
Feature: Track resume versions used for applications
  As a job seeker
  I want reusable private resume versions
  So that I can record which resume I used for each opportunity

  Scenario: Create a resume version
    Given I am signed in
    When I create a resume version with a unique name and optional notes
    Then it should appear in my resume versions

  Scenario: Reject a duplicate resume name
    Given I own a resume version named "Full-stack resume"
    When I create or rename another version to "Full-stack resume"
    Then the response status should be 409
    And the duplicate version should not be saved

  Scenario: Rename and annotate a resume version
    Given I own a resume version
    When I update its name and notes
    Then the updated version should appear in my resume versions

  Scenario: Keep resume versions private
    Given another user owns a resume version
    When I list, update, delete, or assign resume versions
    Then I should not see, change, delete, or assign the other user's version

  Scenario: Associate a resume version with an application
    Given I own a resume version
    When I create or update an application
    Then I should be able to associate that resume version
    And the application details should show the resume version name

  Scenario: Leave an application without a resume version
    Given I am creating or editing an application
    When I choose no resume version
    Then the application should be saved without a resume association

  Scenario: Delete a resume version
    Given I own a resume version associated with an application
    When I delete the resume version
    Then it should no longer appear in my resume versions
    And the application should remain stored without a resume association
