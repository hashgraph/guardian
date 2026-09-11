import { getMenuItems, NavbarMenuItem } from './menu.model';

describe('getMenuItems', () => {
    const user = (flags: Record<string, boolean> = {}) => flags as any;
    const titles = (menu: NavbarMenuItem[]) => menu.map((m) => m.title);
    const childTitles = (item: NavbarMenuItem) => (item.childItems || []).map((c) => c.title);

    // /schema-templates requires TEMPLATES_TEMPLATE_READ, so gating the nav item on
    // schema-read showed it to roles that PermissionsGuard then bounced to
    // "Access Restricted" - a dead link.
    describe('Schema Templates is gated on the permission its route requires', () => {
        it('is hidden from a schema reader who cannot read templates', () => {
            const menu = getMenuItems(user({ SCHEMAS_SCHEMA_READ: true }));
            expect(childTitles(menu[0])).not.toContain('Schema Templates');
        });

        it('is hidden from a system-schema reader who cannot read templates', () => {
            const menu = getMenuItems(user({ SCHEMAS_SYSTEM_SCHEMA_READ: true }));
            expect(childTitles(menu[0])).not.toContain('Schema Templates');
        });

        it('opens the Manage section for a template reader alone', () => {
            const menu = getMenuItems(user({ TEMPLATES_TEMPLATE_READ: true }));
            expect(titles(menu)).toEqual(['Manage']);
            expect(childTitles(menu[0])).toEqual(['Schema Templates']);
        });

        it('appears alongside the schema entry when both are held', () => {
            const menu = getMenuItems(user({
                SCHEMAS_SCHEMA_READ: true,
                TEMPLATES_TEMPLATE_READ: true,
            }));
            expect(childTitles(menu[0])).toEqual(['Schemas', 'Schema Templates']);
        });
    });

    it('still builds nothing for a user with no permissions', () => {
        expect(getMenuItems(user())).toEqual([]);
    });
});
