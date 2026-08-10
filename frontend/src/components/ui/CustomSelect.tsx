import { Select, createListCollection } from '@chakra-ui/react'
import { Check } from 'lucide-react'

export type CustomSelectOption = {
  label: string
  value: string
}

type CustomSelectProps = {
  'aria-label'?: string
  disabled?: boolean
  name?: string
  onChange: (value: string) => void
  options: CustomSelectOption[]
  placeholder?: string
  value: string
}

/** A fully styled Chakra select with a custom popup list and keyboard navigation. */
export function CustomSelect({
  'aria-label': ariaLabel,
  disabled,
  name,
  onChange,
  options,
  placeholder,
  value,
}: CustomSelectProps) {
  const collection = createListCollection({ items: options })

  return (
    <Select.Root
      collection={collection}
      disabled={disabled}
      name={name}
      value={value ? [value] : []}
      onValueChange={(details) => onChange(details.value[0] ?? '')}
    >
      <Select.HiddenSelect aria-label={ariaLabel} />
      <Select.Control>
        <Select.Trigger bg="bg" borderColor="border" borderRadius="md" borderWidth="1px" h="10" px="3" w="full">
          <Select.ValueText placeholder={placeholder} />
          <Select.IndicatorGroup>
            <Select.Indicator />
          </Select.IndicatorGroup>
        </Select.Trigger>
      </Select.Control>
      <Select.Positioner>
        <Select.Content bg="bg.panel" borderColor="border" borderRadius="md" borderWidth="1px" boxShadow="lg" p="1">
          {collection.items.map((item) => (
            <Select.Item item={item} key={item.value} borderRadius="sm" px="3" py="2">
              <Select.ItemText>{item.label}</Select.ItemText>
              <Select.ItemIndicator><Check aria-hidden size={16} /></Select.ItemIndicator>
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Positioner>
    </Select.Root>
  )
}
