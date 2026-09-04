const ROLE_LABELS = {
  super_admin: 'Super Admin',
  owner: 'Owner',
  collaborator: 'Collaborator',
  scanner: 'Scanner',
  guest: 'Guest',
};

const ROLE_TONES = {
  super_admin: 'bg-gradient-gold text-surface-charcoal',
  owner: 'bg-brand-gold-glow text-brand-gold-deep dark:text-brand-gold-soft',
  collaborator: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
  scanner: 'bg-blue-500/15 text-blue-700 dark:text-blue-400',
};

export function roleLabel(role) {
  return ROLE_LABELS[role] || (role || '').split('_').map((s) => s[0]?.toUpperCase() + s.slice(1)).join(' ');
}

export function roleClass(role) {
  return ROLE_TONES[role] || 'bg-surface-mist text-surface-charcoal';
}
