@v0.1 @api @validation
Feature: Validate application input
  As a system owner
  I want invalid input to be rejected by the backend
  So that application data remains trustworthy

  Scenario Outline: Reject a missing required field
    When I create an application without <field>
    Then the response status should be 400
    And the validation response should identify <field>

    Examples:
      | field    |
      | company  |
      | jobTitle |

  Scenario Outline: Reject a blank required field
    When I create an application with a blank <field>
    Then the response status should be 400
    And the validation response should identify <field>

    Examples:
      | field    |
      | company  |
      | jobTitle |

  Scenario Outline: Reject an invalid or unsafe job URL
    When I create an application with job URL "<jobUrl>"
    Then the response status should be 400
    And the validation response should identify "jobUrl"

    Examples:
      | jobUrl                                      |
      | not-a-url                                   |
      | javascript:alert(1)                         |
      | data:text/html,<script>alert(1)</script>    |
      | ftp://jobs.example/1                        |

  Scenario: Reject an unsupported status
    When I create an application with status "UNKNOWN"
    Then the response status should be 400
    And the validation response should identify "status"

  Scenario: Reject an invalid applied date
    When I create an application with applied date "not-a-date"
    Then the response status should be 400
    And the validation response should identify "appliedAt"

  Scenario: Reject an empty update
    Given an application exists
    When I update the application without any fields
    Then the response status should be 400
