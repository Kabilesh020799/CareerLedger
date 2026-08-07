@roadmap @applications
Feature: Find and navigate applications
  As a job seeker
  I want server-side search, filters, sorting, and pagination
  So that I can efficiently navigate a large application history

  Scenario Outline: Search applications
    Given applications exist with different <field> values
    When I search for matching text
    Then only applications matching <field> should be returned

    Examples:
      | field    |
      | company  |
      | jobTitle |
      | location |

  Scenario Outline: Filter applications
    Given applications exist with different attributes
    When I filter applications by <filter>
    Then only matching applications should be returned

    Examples:
      | filter     |
      | status     |
      | source     |
      | date range |

  Scenario Outline: Sort applications
    Given several applications exist
    When I sort by <field> in descending order
    Then applications should be returned in the requested order

    Examples:
      | field     |
      | appliedAt |
      | createdAt |
      | updatedAt |
      | company   |

  Scenario: Paginate applications
    Given more than 20 applications exist
    When I request page 2 with a limit of 20
    Then the response should contain the second page of data
    And pagination metadata should include page, limit, total, and pages
