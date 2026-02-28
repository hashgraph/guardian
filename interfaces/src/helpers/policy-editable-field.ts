export class PolicyEditableFieldDTO {
	public blockType: string;
	public blockTag: string;
	public propertyPath: string;
	public visible: string[];
	public applyTo: string[];
	public label: string;
	public defaultLabel: any;
	public required: boolean;
	public shortDescription: string;

	public value?: any;

	public static fromDTO(dto: PolicyEditableFieldDTO): PolicyEditableField {
		return Object.assign(new PolicyEditableField(), dto);
	}
}

export class PolicyEditableField {
	public blockType: string = '';
	public blockTag: string = '';
    public propertyPath: string = '';
    public visible: string[] = [];
    public applyTo: string[] = [];
    public defaultLabel: any = null;
    public required: boolean = false;
    public blocks: any[] = [];
    public properties: any[] = [];
    public roles: any[] = [];
    public targets: any[] = [];
	public label: string = '';
	public shortDescription: string = '';

	toDTO(): PolicyEditableFieldDTO {
		const dto = new PolicyEditableFieldDTO();
		dto.blockType = this.blockType;
		dto.blockTag = this.blockTag;
		dto.propertyPath = this.propertyPath;
		dto.visible = this.visible;
		dto.applyTo = this.applyTo;
		dto.label = this.label;
		dto.defaultLabel = this.defaultLabel;
		dto.required = this.required;
		dto.shortDescription = this.shortDescription;

		return dto;
	}
}