@v0.1 @infrastructure
Feature: Persist application data
  As a job seeker
  I want my application records to survive service restarts
  So that I do not lose my job-search history

  Scenario: Start the complete local application stack
    Given Docker is available
    When I start the project with Docker Compose
    Then PostgreSQL should become healthy
    And the database migrations should be applied
    And the backend health endpoint should respond successfully
    And the frontend should be available in the browser

  Scenario: Load demo applications on first startup
    Given the application database has been migrated
    When the startup seed runs
    Then representative applications should be available in the applications list

  Scenario: Do not duplicate demo applications on restart
    Given the demo applications already exist
    When the application stack is restarted
    Then each demo application should still appear exactly once

  Scenario: Applications survive a PostgreSQL container restart
    Given an application has been saved to PostgreSQL
    When the PostgreSQL container is restarted
    And the API reconnects to PostgreSQL
    Then the saved application should still be available
