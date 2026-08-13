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

  Scenario: Operators can inspect service health and saturation
    Given the production monitoring stack is running
    Then dashboards show traffic, error rate, latency, queue depth, Gmail failures, PostgreSQL, Redis, Nginx, host, and container saturation
    And monitoring endpoints are not exposed on the public application origin

  Scenario: Alerts identify symptoms that require action
    Given a user-impacting failure or sustained resource pressure crosses its threshold
    Then Prometheus raises an alert with the observed symptom and a concrete operator action
    And transient informational events do not page an operator
