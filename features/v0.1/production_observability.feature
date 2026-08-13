Feature: Correlate production failures safely
  As an application operator
  I want API requests and background jobs to emit structured correlation data
  So that I can investigate failures without collecting private user content

  Scenario: An API response can be matched to its completion log
    When a client makes an API request
    Then the response includes a server-generated request reference
    And the structured completion log includes the same reference, response status, and duration

  Scenario: An unexpected error remains safe for the user
    Given an API request fails unexpectedly
    Then the response contains a generic error and its request reference
    And the server log records the exception against that reference
    And the response does not expose a stack trace or internal error details

  Scenario: Sensitive content is excluded from logs
    When the application handles credentials, sessions, email messages, or resumes
    Then structured logs do not contain passwords, tokens, cookies, message bodies, document content, or signed storage URLs

  Scenario: A background failure can be correlated
    Given a scheduled background job fails
    Then its structured log identifies the worker, job, attempt, duration, release, and commit
    And the worker retains its configured retry behavior

  Scenario: Production avoids optional observability overhead
    When the application is deployed to production
    Then request logging and API metrics are disabled
    And the application services run without monitoring or dashboard containers
