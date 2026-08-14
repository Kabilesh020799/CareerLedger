@v0.1 @api @ui @applications
Feature: Find and navigate applications
  As a job seeker
  I want server-side search, filters, sorting, and pagination
  So that I can efficiently navigate a large application history

  Scenario Outline: Search applications without case sensitivity
    Given I own applications with different <field> values
    When I search for matching text using different letter casing
    Then only applications matching <field> should be returned

    Examples:
      | field    |
      | company  |
      | jobTitle |
      | location |

  Scenario: Combine application filters
    Given I own applications with different statuses, sources, and applied dates
    When I filter by status, source, and an applied-date range
    Then only applications matching every selected filter should be returned

  Scenario Outline: Sort applications
    Given I own several applications
    When I sort by <field> in descending order
    Then applications should be returned in the requested order

    Examples:
      | field     |
      | appliedAt |
      | createdAt |
      | updatedAt |
      | company   |

  Scenario: Paginate applications
    Given I own more than 20 applications
    When I request page 2 with a limit of 20
    Then the response should contain the second page of my applications
    And pagination metadata should include page, limit, total, and pages

  Scenario: Load large board and application-choice collections in bounded pages
    Given I own more than 50 applications
    When I open the application board or an application chooser
    Then the interface should request applications in pages of at most 50
    And every owned application should remain available after all pages load

  Scenario: Inspect API and database duration without enabling logging
    When I request a page of applications
    Then the response should include total request duration timing
    And the response should include aggregate database duration and query count
    And no request or query details should be retained

  Scenario: Keep discovery scoped to the authenticated user
    Given another user owns an application matching my search
    When I search my applications
    Then the other user's application should not be returned

  Scenario: Reject invalid discovery parameters
    When I request applications with an unsupported sort field or invalid page
    Then the response status should be 400
    And no application query should run

  Scenario: Preserve discovery controls in the URL
    Given I am viewing the applications page
    When I apply search, filters, sorting, or pagination
    Then the selected values should appear in the page URL
    And refreshing the page should restore the same results

  Scenario: Show no matching applications
    Given applications exist but none match my selected discovery controls
    When the filtered results load
    Then I should see a no-results state
    And I should be able to clear all discovery controls
