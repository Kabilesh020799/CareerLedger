# Frontend UI standard

Chakra UI is the component and styling system for the React application.

## Rules

- Install and configure Chakra at the application root before building product pages.
- Use Chakra layout, form, feedback, overlay, table, and navigation components where appropriate.
- Use theme tokens for colors, spacing, typography, radii, shadows, and breakpoints.
- Define repeated product-specific tokens or variants in the Chakra theme rather than duplicating literal values.
- Prefer responsive Chakra props over separate device-specific markup.
- Preserve semantic HTML, visible focus states, keyboard operation, and accessible labels.
- Use React Hook Form and Zod for form state and validation; Chakra supplies the visual form controls and error presentation.
- Represent loading, empty, error, and success states consistently.
- Use standalone CSS only for requirements Chakra cannot express clearly. Avoid mixing in a second component or utility-CSS framework.

Functionality and accessibility take priority over visual polish during V0.1.
