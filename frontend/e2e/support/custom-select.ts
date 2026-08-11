import type { Locator, Page } from '@playwright/test'

/** Selects an option through the visible Chakra combobox and portalled listbox. */
export async function chooseCustomSelectOption(
  page: Page,
  accessibleName: string,
  optionName: string,
  scope: Page | Locator = page,
) {
  const trigger = scope.getByRole('combobox', { name: accessibleName })
  await trigger.click()
  await page.getByRole('option', { name: optionName, exact: true }).click()
}
