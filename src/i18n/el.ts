import type { Catalog } from './en';

export const el: Catalog = {
  common: { close: 'Κλείσιμο', cancel: 'Άκυρο', retry: 'Επανάληψη' },
  settings: { language: 'Γλώσσα' },
  threat: {
    hazardVerdict: '🚨 Κλείδωσε τις πόρτες. (Πλάκα κάνω, αλλά είναι κοντά!)',
    watchVerdict: '👀 Μάτια στον ουρανό.',
    safeVerdict: '🛡️ Ετυμηγορία: Όχι σήμερα, πετρόβραχοι.',
    hazardShort: 'Κλείδωσε τις πόρτες (πλάκα κάνω… σχεδόν)',
    watchShort: 'Μάτια στον ουρανό',
    safeShort: 'Όχι σήμερα, πετρόβραχοι',
  },
};
