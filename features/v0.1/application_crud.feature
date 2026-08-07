@v0.1 @api @applications
Feature: Manage job applications through the API
  As a job seeker
  I want to manage my applications
  So that I have an accurate record of my job search

  Background:
    Given the application API is available

  Scenario: List applications when none exist
    Given no applications exist
    When I request all applications
    Then the response status should be 200
    And the application list should be empty

  Scenario: Create an application with required fields
    When I create an application with:
      | company  | Acme Corp         |
      | jobTitle | Software Engineer |
    Then the response status should be 201
    And the application should have a generated identifier
    And the application status should be "SAVED"
    And created and updated timestamps should be present

  Scenario: Create an application with all supported fields
    When I create an application with:
      | company   | Acme Corp                          |
      | jobTitle  | Software Engineer                  |
      | location  | Remote                             |
      | jobUrl    | https://example.com/jobs/engineer |
      | source    | LinkedIn                           |
      | status    | APPLIED                            |
      | notes     | Referred by a colleague            |
      | appliedAt | 2026-08-06T12:00:00.000Z           |
    Then the response status should be 201
    And the saved application should contain the supplied fields

  Scenario: Retrieve an application
    Given an application exists
    When I request that application by its identifier
    Then the response status should be 200
    And the response should contain that application

  Scenario: Retrieve an unknown application
    When I request an unknown application identifier
    Then the response status should be 404
    And the response should report "Application not found"

  Scenario: Update an application
    Given an application exists with status "APPLIED"
    When I update its status to "INTERVIEW"
    Then the response status should be 200
    And the application status should be "INTERVIEW"
    And its updated timestamp should be newer

  Scenario: Update an unknown application
    When I update an unknown application identifier
    Then the response status should be 404
    And the response should report "Application not found"

  Scenario: Delete an application
    Given an application exists
    When I delete that application
    Then the response status should be 204
    And requesting that application should return 404

  Scenario: Delete an unknown application
    When I delete an unknown application identifier
    Then the response status should be 404
