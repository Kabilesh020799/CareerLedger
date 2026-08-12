import type { Locator, Page } from '@playwright/test'

/** Selects a Chakra option through its stable native form bridge. */
export async function chooseCustomSelectOption(
  page: Page,
  accessibleName: string,
  optionName: string,
  scope: Page | Locator = page,
) {
  const trigger = scope.getByRole('combobox', { name: accessibleName })
  const root = trigger.locator(
    'xpath=ancestor::*[@data-scope="select" and @data-part="root"][1]',
  )
  const nativeSelect = root.locator('select')

  // Chakra renders a stable native select as the custom control's form and
  // accessibility bridge. Selecting through that bridge avoids racing the
  // animated portal, whose option nodes may be remounted while opening.
  await nativeSelect.evaluate((select, label) => {
    const option = Array.from(select.options).find(
      (candidate) => candidate.label === label,
    )
    if (!option) throw new Error(`Custom select option "${label}" was not found`)

    select.value = option.value
    select.dispatchEvent(new Event('change', { bubbles: true }))
  }, optionName)
}
