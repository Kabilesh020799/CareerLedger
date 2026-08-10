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
