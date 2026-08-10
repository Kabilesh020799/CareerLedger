@v0.1 @api @ui @resumes
Feature: Tag resume strategies used for applications
  As a job seeker
  I want reusable private resume tags
  So that I can compare which resume strategy works for each opportunity

  Scenario: Create a suggested resume tag
    Given I am signed in
    When I choose an available suggested resume tag
    Then it should appear in my resume tags

  Scenario: Create a custom resume tag
    Given I am signed in
    When I create a resume tag with a unique custom name
    Then it should appear in my resume tags

  Scenario: Reject a duplicate resume tag name
    Given I own a resume tag named "Full-stack resume"
    When I create or rename another tag to "Full-stack resume"
    Then the response status should be 409
    And the duplicate tag should not be saved

  Scenario: Rename a resume tag
    Given I own a resume tag
    When I update its name
    Then the updated tag should appear in my resume tags

  Scenario: Keep resume tags private
    Given another user owns a resume tag
    When I list, update, delete, or assign resume tags
    Then I should not see, change, delete, or assign the other user's tag

  Scenario: Associate a resume tag with an application
    Given I own a resume tag
    When I create or update an application
    Then I should be able to associate that resume tag
    And the application details should show the resume tag name

  Scenario: Leave an application without a resume tag
    Given I am creating or editing an application
    When I choose no resume tag
    Then the application should be saved without a resume association

  Scenario: Delete a resume tag
    Given I own a resume tag associated with an application
    When I delete the resume tag
    Then it should no longer appear in my resume tags
    And the application should remain stored without a resume association
