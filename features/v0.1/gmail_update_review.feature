@v0.1 @gmail @api @ui
Feature: Review recruitment updates discovered from Gmail
  As a job seeker
  I want synchronized recruitment messages converted into reviewable suggestions
  So that I can keep applications current without surrendering control

  Scenario Outline: Classify common recruitment messages deterministically
    Given a synchronized Gmail message contains <phrase>
    When the message is processed
    Then a pending update should suggest <status>

    Examples:
      | phrase                         | status     |
      | thank you for applying         | APPLIED    |
      | coding assessment              | ASSESSMENT |
      | schedule an interview          | INTERVIEW  |
      | we will not be moving forward  | REJECTED   |
      | pleased to offer               | OFFER      |

  Scenario: Ignore an unrelated synchronized message
    Given a synchronized Gmail message is not recruitment-related
    When the message is processed
    Then no application update should be proposed

  Scenario: Propose the strongest owned application match
    Given a recruitment message identifies an existing application by company, role, sender, or timing
    When the message is processed
    Then the strongest sufficiently confident owned application should be proposed
    And no application should be changed automatically

  Scenario: Leave an uncertain message unmatched
    Given no owned application matches a recruitment message with sufficient confidence
    When the message is processed
    Then a pending new-application suggestion should be shown
    And no application should be created automatically

  Scenario: Confirm a matched status update
    Given a pending Gmail update is matched to my application
    When I confirm its proposed status
    Then the application status and review decision should be saved together
    And a status-change event should be recorded in the same transaction

  Scenario: Correct a match before confirming it
    Given a pending Gmail update has an incorrect application or status suggestion
    When I choose one of my applications and a supported status and confirm
    Then the corrected application should be updated

  Scenario: Confirm a new application suggestion
    Given a pending Gmail update is not matched to an application
    When I provide a company and job title and confirm creation
    Then a new application owned by me should be created from the suggestion
    And a Gmail review event should be recorded

  Scenario: Ignore a detected update
    Given a detected Gmail update is pending review
    When I ignore it
    Then no application should be changed
    And the update should no longer appear in the pending queue

  Scenario: Prevent a review from being applied twice
    Given a Gmail update has already been confirmed or ignored
    When I try to resolve it again
    Then the request should be rejected as a conflict

  Scenario: Keep the review queue private
    Given another user has pending Gmail updates and applications
    When I list or resolve Gmail updates
    Then I should not see or change the other user's records

  Scenario: Minimize synchronized message storage
    When a Gmail message is processed
    Then its body and transient snippet should not be stored
    And only detected recruitment updates should retain the subject and sender needed for review

