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

  Scenario: Initialize the production database on the first deployment
    Given a prepared production instance has no application environment file
    When the first release is deployed
    Then protected PostgreSQL credentials should be generated on the instance
    And the PostgreSQL container should start with a persistent volume
    And later deployments should preserve the credentials and database volume

  Scenario: Verify the backend from a clean checkout
    Given generated Prisma client files are not committed
    When backend type checking or compilation runs in verification
    Then the Prisma client should be generated before TypeScript compilation

  Scenario: Release a new application version from the default branch
    Given the root package version has not been released
    When that version is pushed to the default branch and verification passes
    Then a semantic GitHub Release should be created for that version
    And frontend and backend images should be published with that version
    And the production instance should deploy that exact release version
    And the deployment should be accepted only after its health check passes

  Scenario: Do not release the same application version twice
    Given the root package version already has a GitHub Release
    When another commit with the same version is pushed to the default branch
    Then verification should run
    But no images, release, or production deployment should be created

  Scenario Outline: Select the next semantic release version
    Given the current root package version has been released
    When completed changes contain a <change type>
    Then the next release should increment the <version part>

    Examples:
      | change type                         | version part |
      | backward-compatible feature         | minor        |
      | backward-compatible fix             | patch        |
      | backward-incompatible product change | major       |

  Scenario: Do not release repository-only maintenance
    Given the current root package version has been released
    When completed changes affect only documentation, tests, or agent guidance
    Then the root package version should remain unchanged
    And no application release should be created

  Scenario: Preserve the previous release when deployment is unhealthy
    Given a healthy production release is running
    When a newly deployed release fails its health check
    Then the previous frontend and backend image versions should be restored
    And the deployment workflow should report a failure

  Scenario: Keep a failed deployment version eligible for retry
    Given a new version has not completed a healthy production deployment
    When image publication succeeds but production deployment fails
    Then no GitHub Release or source tag should be created for that version
    And a later verified push may retry the same version

  Scenario: Applications survive a PostgreSQL container restart
    Given an application has been saved to PostgreSQL
    When the PostgreSQL container is restarted
    And the API reconnects to PostgreSQL
    Then the saved application should still be available
