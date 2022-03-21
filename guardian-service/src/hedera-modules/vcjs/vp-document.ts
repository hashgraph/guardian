import { IVP } from "interfaces";
import { VcDocument } from "./vc-document";

export class VpDocument {
    private subject: VcDocument[];

    constructor() {
        this.subject = [];
    }

    public getVerifiableCredential(index: number = 0): VcDocument {
        return this.subject[index];
    }

    public getVerifiableCredentials(): VcDocument[] {
        return this.subject;
    }

    public get length(): number {
        return this.subject.length;
    }

    public addCredentialSubject(subject: VcDocument): void {
        this.subject.push(subject);
    }

    public toJson(): string {

    }

    public toJsonTree(): IVP {

    }

    public static fromJson(json: string): VpDocument {

    }

    public static fromJsonTree(json: IVP): VpDocument {

    }

    public toCredentialHash(): string {

    }

    public setId(uuid: string): void {
        throw;
    }

    public addVerifiableCredential(vc: VcDocument): void {
        if (vc) {
            this.subject.push(vc);
        }
    }

    public addVerifiableCredentials(vcs: VcDocument[]): void {
        if (vcs) {
            for (let index = 0; index < vcs.length; index++) {
                this.subject.push(vcs[index]);
            }
        }
    }

    public proofFromJson(json: any): void {
        throw;
    }
}