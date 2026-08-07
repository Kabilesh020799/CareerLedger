@v0.1 @api
Feature: Backend health check
  As a developer
  I want to check whether the API is available
  So that I can diagnose the application stack

  Scenario: The backend is healthy
    When I request the API health endpoint
    Then the response status should be 200
    And the response should report a status of "ok"
