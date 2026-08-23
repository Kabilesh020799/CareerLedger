Feature: Portable application data
  Scenario: Export a workspace
    Given I can access a workspace
    When I download its portable JSON export
    Then applications, timeline events, and reminders are included
    And passwords, sessions, OAuth secrets, tokens, storage keys, and resume bytes are excluded

  Scenario: Import a valid export
    Given I can edit the selected workspace
    When I select a supported portable JSON document
    Then the selected filename should be shown beside the backup picker
    And I should review its source workspace and application count before importing
    When I confirm the reviewed import
    Then new applications and their nested history are created atomically
    And natural-key duplicates are skipped and reported

  Scenario: Reject an invalid or oversized import
    When I import unsupported or excessive data
    Then no imported records are written

  Scenario: Reject unsafe job URLs in an import
    When I import a portable document containing a javascript or data job URL
    Then the import should be rejected
    And no imported records are written
