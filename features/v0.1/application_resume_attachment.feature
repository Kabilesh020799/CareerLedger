@v0.1 @api @ui @applications @resumes
Feature: Attach a resume to an application
  As a job seeker
  I want to attach the submitted resume when I create an application
  So that I can retrieve the exact document used for that role

  Background:
    Given I am signed in

  Scenario: Create an application with a PDF resume
    When I create an application for the "Software Engineer" role at "Acme Corp"
    And I attach a valid PDF resume
    Then the application should be created
    And the resume should be stored with the application
    And its filename should be "Software_Engineer_Acme_Corp.pdf"
    And downloading the resume should return the original document
    And the stored resume should not be publicly accessible

  Scenario: Upload a valid resume through private object storage
    When I create an application with a valid resume up to 5 MB
    Then I should receive short-lived permission for only that upload
    And the application should reference the privately stored resume
    And no permanent storage credentials should be exposed to the browser

  Scenario: Create an application without a resume
    When I create an application without attaching a resume
    Then the application should be created without a resume

  Scenario Outline: Reject an invalid resume attachment
    When I try to create an application with a resume that is <invalid resume>
    Then the application should not be created
    And I should be told why the resume cannot be uploaded

    Examples:
      | invalid resume                         |
      | not a PDF, DOC, or DOCX file           |
      | larger than 5 MB                       |
      | inconsistent with its file extension   |

  Scenario: Download an attached resume
    Given I created an application with a resume
    When I download the application's resume
    Then the browser should download the stored document
    And the download should use the role and company filename

  Scenario: Replace an attached resume while editing an application
    Given I created an application with a resume
    When I edit the application and attach a different valid PDF resume
    Then the application should be updated
    And the new resume should replace the previous document
    And its filename should use the edited role and company
    And the previous privately stored document should be scheduled for deletion

  Scenario: Edit an application without replacing its resume
    Given I created an application with a resume
    When I edit the application without selecting another resume
    Then the existing resume should remain attached

  Scenario: An application has no attached resume
    Given I created an application without a resume
    When I request the application's resume
    Then the response status should be 404
    And the response should report "Resume not found"

  Scenario: Another user cannot download an attached resume
    Given another user created an application with a resume
    When I request that application's resume
    Then the response status should be 404
    And no resume contents should be returned

  Scenario: Delete an application with an attached resume
    Given I created an application with a resume
    When I delete that application
    Then the application and its attached resume should be deleted

  Scenario: Continue downloading a resume stored before object storage was enabled
    Given I created an application with a database-stored resume before the storage migration
    When I download the application's resume
    Then the browser should download the original document

  Scenario: Review my uploaded resumes from the Resumes page
    Given I have uploaded resumes to applications I own
    When I open the Resumes page
    Then I should see each uploaded resume with its application and upload date
    And I should be able to open a PDF resume in a private in-application preview
    And I should be able to open the document in a new tab when an embedded preview is unavailable
    And uploaded documents should remain in a separate tab from strategy tags

  Scenario: Keep uploaded documents when managing resume tags
    Given I have uploaded a resume to an application I own
    When I open the Resumes page
    Then I should see the uploaded resume in the document library
    And I should be able to manage resume tags separately

  Scenario: Application save fails after a direct resume upload
    Given I uploaded a resume but the application could not be saved
    Then the unfinished upload should be deleted
    And no application should reference it
