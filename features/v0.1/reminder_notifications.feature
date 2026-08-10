@v0.1 @notifications @reminders
Feature: Deliver due reminder notifications
  As a job seeker
  I want due reminders delivered outside the dashboard
  So that I do not miss a follow-up or deadline

  Scenario: Enable email reminder delivery
    Given email delivery is configured
    When I enable email notifications
    Then each due open reminder should be emailed to my account address once

  Scenario: Enable browser push delivery
    Given Web Push is configured and my browser grants notification permission
    When I enable browser push notifications
    Then the current browser should receive each due open reminder once
    And opening the notification should navigate to its application

  Scenario: Retry a temporary delivery failure
    Given an enabled notification channel temporarily fails
    When the background delivery job runs
    Then the delivery should retry with backoff
    And it should not be recorded as delivered until sending succeeds

  Scenario: Keep notification subscriptions private
    Given another user has registered a browser subscription
    When I update my notification settings or subscriptions
    Then I should not see or change the other user's subscription

  Scenario: Explain an unavailable channel
    Given email or Web Push has not been configured by the administrator
    When I open notification settings
    Then that channel should be disabled with setup guidance

  Scenario: Change an available notification channel
    Given a notification channel is available
    When I open notification settings
    Then its current enabled state should be represented by an accessible switch
