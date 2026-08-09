@v0.1 @ui @responsive
Feature: Use the application across screen sizes
  As a job seeker
  I want every workflow to adapt to my screen
  So that I can manage applications from a phone, tablet, or computer

  Scenario: Navigate on a phone
    Given I am signed in on a narrow phone screen
    When I open an authenticated page
    Then I should see a compact application header
    And I should be able to open and close the primary navigation
    And choosing a destination should close the navigation
    And the page should not scroll horizontally

  Scenario: Use the application on a tablet
    Given I am signed in on a tablet screen
    When I move between application workflows
    Then content should use the available screen width
    And forms and metric grids should reduce their columns when needed
    And primary actions should remain visible without horizontal page scrolling

  Scenario: Navigate on a computer
    Given I am signed in on a desktop screen
    When I open an authenticated page
    Then I should see persistent primary navigation beside the content
    And the content should remain readable within a bounded width

  Scenario: Use wide data views on a narrow screen
    Given I am viewing an application table, status board, or analytics comparison on a phone
    When the data is wider than the viewport
    Then the data view should scroll within its own region
    And the overall page should not scroll horizontally
    And surrounding controls should remain usable

  Scenario: Complete forms and confirmations on a phone
    Given I am using a narrow phone screen
    When I create or edit an application, resume version, reminder, or timeline note
    Then fields should use a single readable column
    And action buttons should fit or wrap within the screen
    And confirmation dialogs should remain fully visible and operable
