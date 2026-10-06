export type FaqSection = 'dataAndSync' | 'accountsAndAccess' | 'guidedTour';

export interface FaqEntryMeta {
    id: string;
    section: FaqSection;
}

export const FAQ_SECTIONS: FaqSection[] = ['dataAndSync', 'accountsAndAccess', 'guidedTour'];

export const FAQ_ENTRIES: FaqEntryMeta[] = [
    // Data looks wrong or has changed
    { id: 'numbers-changed', section: 'dataAndSync' },
    { id: 'link-different-data', section: 'dataAndSync' },
    { id: 'missing-project', section: 'dataAndSync' },
    { id: 'no-issuances', section: 'dataAndSync' },
    { id: 'no-projected-volume', section: 'dataAndSync' },
    { id: 'minted-vs-supply', section: 'dataAndSync' },
    { id: 'declared-vs-minted', section: 'dataAndSync' },
    { id: 'transferred-dash', section: 'dataAndSync' },
    { id: 'transferred-vs-transactions-empty', section: 'dataAndSync' },
    { id: 'unlisted-serials', section: 'dataAndSync' },

    // Accounts and access
    { id: 'no-verification-email', section: 'accountsAndAccess' },
    { id: 'forced-password-change', section: 'accountsAndAccess' },
    { id: 'greyed-out-button', section: 'accountsAndAccess' },
    { id: 'empty-portfolio-new-device', section: 'accountsAndAccess' },

    // The guided tour
    { id: 'tour-wont-restart', section: 'guidedTour' },
    { id: 'tour-restarted-new-computer', section: 'guidedTour' },
    { id: 'cannot-click-during-tour', section: 'guidedTour' },
];
