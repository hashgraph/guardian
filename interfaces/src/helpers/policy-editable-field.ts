export class PolicyEditableField {
	public blockTag: string = '';
    public property: string = '';
    public visible: string[] = [];
    public appliesTo: string[] = [];
    public defaultLabel: any = null;
    public required: boolean = false;
    public blocks: any[] = [];
    public properties: any[] = [];
    public roles: any[] = [];
    public targets: any[] = [];
	public label: string = '';
	public shortDescription: string = '';
 
	constructor(blocks: any[]) {
	}

	toJson(): { blockTag: string; property: string; visible: string[]; appliesTo: string[]; label: string, defaultLabel: string; required: boolean; shortDescription: string } {
		return {
			blockTag: this.blockTag,
			property: this.property,
			visible: this.visible,
			appliesTo: this.appliesTo,
			label: this.label,
			defaultLabel: this.defaultLabel,
			required: this.required,
			shortDescription: this.shortDescription,
		}
	}
}