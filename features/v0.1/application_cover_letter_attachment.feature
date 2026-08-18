@v0.1 @api @ui @applications @cover-letters
Feature: Attach a cover letter to an application
  As a job seeker
  I want to attach the submitted cover letter to an application
  So that I can retrieve the exact document sent for that role

  Background:
    Given I am signed in

  Scenario: Create an application with a PDF cover letter
    When I create an application for the "Software Engineer" role at "Acme Corp"
    And I attach a valid PDF cover letter
    Then the application should be created
    And the cover letter should be stored with the application
    And its cover letter filename should be "Software_Engineer_Acme_Corp_Cover_Letter.pdf"
    And downloading the cover letter should return the original document
    And the stored cover letter should not be publicly accessible

  Scenario: Create an application with both submitted documents
    When I create an application with a valid resume and a valid cover letter
    Then the application should reference both privately stored documents
    And no permanent storage credentials should be exposed to the browser

  Scenario: Create an application without a cover letter
    When I create an application without attaching a cover letter
    Then the application should be created without a cover letter

  Scenario Outline: Reject an invalid cover letter attachment
    When I try to create an application with a cover letter that is <invalid cover letter>
    Then the application should not be created
    And I should be told why the cover letter cannot be uploaded

    Examples:
      | invalid cover letter                  |
      | not a PDF, DOC, or DOCX file          |
      | larger than 5 MB                      |
      | inconsistent with its file extension  |

  Scenario: Replace an attached cover letter while editing an application
    Given I created an application with a cover letter
    When I edit the application and attach a different valid cover letter
    Then the application should be updated
    And the new cover letter should replace the previous document
    And its cover letter filename should use the edited role and company
    And the previous privately stored document should be scheduled for deletion

  Scenario: Edit an application without replacing its cover letter
    Given I created an application with a cover letter
    When I edit the application without selecting another cover letter
    Then the existing cover letter should remain attached

  Scenario: An application has no attached cover letter
    Given I created an application without a cover letter
    When I request the application's cover letter
    Then the response status should be 404
    And the response should report "Cover letter not found"

  Scenario: Another user cannot download an attached cover letter
    Given another user created an application with a cover letter
    When I request that application's cover letter
    Then the response status should be 404
    And no cover letter contents should be returned

  Scenario: Delete an application with an attached cover letter
    Given I created an application with a cover letter
    When I delete that application
    Then the application and its attached cover letter should be deleted

  Scenario: Application save fails after a direct cover letter upload
    Given I uploaded a cover letter but the application could not be saved
    Then the unfinished cover letter upload should be deleted
    And no application should reference it
