export class PolicyEditableFieldDto {
	constructor() {
	}

	public blockTag: string;
	public property: string;
	public visible: string[];
	public appliesTo: string[];
	public label: string;
	public defaultLabel: any;
	public required: boolean;
	public shortDescription: string;

	public static fromDTO(dto: PolicyEditableFieldDto): PolicyEditableField {
		return Object.assign(new PolicyEditableField(), dto);
	}
}

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

	constructor() {
	}

	toDTO(): PolicyEditableFieldDto {
		const dto = new PolicyEditableFieldDto();
		dto.blockTag = this.blockTag;
		dto.property = this.property;
		dto.visible = this.visible;
		dto.appliesTo = this.appliesTo;
		dto.label = this.label;
		dto.defaultLabel = this.defaultLabel;
		dto.required = this.required;
		dto.shortDescription = this.shortDescription;

		return dto;
	}
}