Feature: Team workspaces
  Scenario: Create and select a workspace
    Given I am signed in
    When I create and select a team workspace
    Then application requests use that workspace
    And cached data from the previous workspace is not reused

  Scenario: Invite a member securely
    Given I manage a team workspace
    When I invite an email address with a non-owner role
    Then a one-time invitation token is shown
    And only its hash is retained by the application

  Scenario: Accept an invitation
    Given I am signed in with the invited email address
    When I accept an unexpired invitation token
    Then I become a member of the workspace
    And the token cannot be replayed

  Scenario: Protect shared applications by role
    Given I selected a team workspace
    Then members may read its applications
    And viewers cannot change them
    And inaccessible workspace resources are not disclosed

  Scenario: Preserve a workspace owner
    Given a workspace has one owner
    When someone attempts to remove or demote that owner
    Then the change is rejected
