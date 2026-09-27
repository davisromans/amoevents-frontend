// Mirrors src/utils/seatType.js on the backend exactly — same rule, so a
// guest's seat-type label never differs between what the frontend shows
// (guest list, detail sheet, scanner) and what's actually printed on their
// card or sent in a message. The word "Multiple" never appears — Single,
// Double, Triple, then counts above 3 as a multiple of Double ("Double
// x10" for 20 people), with a "+ Single" remainder for an odd count.
export function seatTypeLabel(guest) {
  if (guest?.type === 'double') return 'Double';
  if (guest?.type !== 'family') return 'Single';

  const n = Number(guest.familySize) || 1;
  if (n <= 1) return 'Single';
  if (n === 2) return 'Double';
  if (n === 3) return 'Triple';
  const doubles = Math.floor(n / 2);
  const remainder = n % 2;
  return remainder ? `Double x${doubles} + Single` : `Double x${doubles}`;
}
