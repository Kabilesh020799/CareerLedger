@v0.1 @ui @theme
Feature: Choose an application color theme
  As a job seeker
  I want a readable light or dark appearance
  So that I can use the tracker comfortably in different environments

  Scenario: Use the system preference initially
    Given I have not previously selected a color theme
    And my device prefers dark colors
    When I open the application
    Then the dark theme should be active

  Scenario: Switch between light and dark themes
    Given the light theme is active
    When I choose the dark theme
    Then the application should immediately use dark surfaces and readable text
    And the theme control should offer the light theme

  Scenario: Remember the selected theme
    Given I selected the dark theme
    When I reload the application
    Then the dark theme should remain active

  Scenario: Use the theme control before and after sign-in
    Given I am on the sign-in page or an authenticated page
    When I navigate using a keyboard or screen reader
    Then I should find a labelled theme control
    And I should be able to activate it
