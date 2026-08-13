Feature: Portable application data
  Scenario: Export a workspace
    Given I can access a workspace
    When I download its portable JSON export
    Then applications, timeline events, and reminders are included
    And passwords, sessions, OAuth secrets, tokens, storage keys, and resume bytes are excluded

  Scenario: Import a valid export
    Given I can edit the selected workspace
    When I import a supported portable JSON document
    Then new applications and their nested history are created atomically
    And natural-key duplicates are skipped and reported

  Scenario: Reject an invalid or oversized import
    When I import unsupported or excessive data
    Then no imported records are written
