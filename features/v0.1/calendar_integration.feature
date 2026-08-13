Feature: Calendar integration
  Scenario: Review milestones on a calendar
    Given I have upcoming deadlines or interview milestones
    When I open the Calendar page
    Then I see them in a navigable month calendar
    And I can open the related application

  Scenario: Download a calendar snapshot
    Given I am signed in
    When I export my calendar
    Then open deadlines and interview milestones are downloaded as an iCalendar file

  Scenario: Subscribe from a calendar client
    When I create a calendar subscription
    Then a private high-entropy feed URL is shown once
    And the application stores only a hash of its token

  Scenario: Rotate or revoke a calendar subscription
    Given I have an active calendar subscription
    When I replace or revoke it
    Then the old feed URL no longer returns calendar data

  Scenario: Keep calendar feeds private
    When an unknown or revoked feed token is requested
    Then the application returns a non-disclosing not-found response
