// Barrel export — one import line per file, always this path.
//   import { Button, TextInput, Card } from '@/components/ui';
// Never import individual UI primitives via their full path from app code;
// this indirection lets us rename/relocate primitives without a codemod.

export { default as Button }        from './Button.vue';
export { default as Field }         from './Field.vue';
export { default as TextInput }     from './TextInput.vue';
export { default as Textarea }      from './Textarea.vue';
export { default as Select }        from './Select.vue';
export { default as Checkbox }      from './Checkbox.vue';
export { default as Switch }        from './Switch.vue';
export { default as OtpInput }      from './OtpInput.vue';
export { default as Badge }         from './Badge.vue';
export { default as StatusDot }     from './StatusDot.vue';
export { default as Avatar }        from './Avatar.vue';
export { default as Kbd }           from './Kbd.vue';
export { default as Card }          from './Card.vue';
export { default as SectionHeader } from './SectionHeader.vue';
export { default as Divider }       from './Divider.vue';
export { default as Progress }      from './Progress.vue';
export { default as Skeleton }      from './Skeleton.vue';
export { default as StatTile }      from './StatTile.vue';
export { default as EmptyState }    from './EmptyState.vue';
// Overlays
export { default as Modal }         from './Modal.vue';
export { default as Sheet }         from './Sheet.vue';
export { default as Popover }       from './Popover.vue';
export { default as Menu }          from './Menu.vue';
export { default as Tooltip }       from './Tooltip.vue';
export { default as Tabs }          from './Tabs.vue';
export { default as Toast }         from './Toast.vue';
export { default as CommandPalette }from './CommandPalette.vue';
