import {Component, Inject} from '@angular/core';
import {
    AbstractControl,
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    ValidationErrors,
    ValidatorFn,
    Validators,
} from '@angular/forms';
import {moreThanZeroValidator} from 'src/app/validators/more-than-zero.validator';
import {Token} from '@guardian/interfaces';
import {TokenService} from 'src/app/services/token.service';
import {DynamicDialogRef} from 'primeng/dynamicdialog';

/**
 * Dialog for creating pair.
 */
@Component({
    selector: 'set-pool-dialog',
    templateUrl: './set-pool-dialog.component.html',
    styleUrls: ['./set-pool-dialog.component.scss'],
    providers: [],
})
export class SetPoolDialogComponent {
    loading: boolean = false;
    _tokenList: Token[] = [];
    immediately: UntypedFormControl;
    tokens: UntypedFormArray;

    form: UntypedFormGroup;

    get tokenControls() {
        return (this.tokens?.controls || []) as UntypedFormGroup[];
    }

    constructor(
        public tokenService: TokenService,
        private dialogRef: DynamicDialogRef,
    ) {
    }

    ngOnInit() {
        this.loading = true;
        this.tokenService.getTokens().subscribe((data: any) => {
            this._tokenList = data
                .map((e: any) => new Token(e))
                .filter(
                    (token: Token) => !token.draftToken && token.wipeContractId
                );
            this.loading = false;
        });
        const tokens = new UntypedFormArray(
            [],
            [Validators.required, this.moreThanTokensZeroValidator()]
        );
        const immediately = new UntypedFormControl(true, Validators.required);
        this.form = new UntypedFormGroup(
            {
                tokens,
                immediately,
            },
            Validators.required
        );
        this.tokens = tokens;
        this.immediately = immediately;
    }

    onNoClick(): void {
        this.dialogRef.close(null);
    }

    get transformedFormValue() {
        const formValue = this.form.value;

        return {
            ...formValue,
            tokens: formValue.tokens.map((item: any) => ({
                ...item,
                token: item.token.tokenId,
            })),
        };
    }

    onCreate() {
        this.dialogRef.close(this.transformedFormValue);
    }

    addToken() {
        this.tokens.push(
            new UntypedFormGroup({
                token: new UntypedFormControl('', Validators.required),
                count: new UntypedFormControl(0, [
                    Validators.required,
                    moreThanZeroValidator(),
                ]),
            })
        );
    }

    removeToken(index: number) {
        this.tokens.removeAt(index);
    }

    getTokenList(tokenId: string) {
        const chosenTokens =
            this.tokens.value
                ?.filter((item: { token: string }) => item.token !== tokenId)
                .map((item: { token: any }) => item.token) || [];

        return this._tokenList.filter((tokenFromList) =>
            !chosenTokens.find((chosenToken: Token) => chosenToken.tokenId === tokenFromList.tokenId))
    }

    moreThanTokensZeroValidator(): ValidatorFn {
        return (control: AbstractControl): ValidationErrors | null => {
            const value = control.value || [];
            for (const token of value) {
                const tokenConfig = this._tokenList.find(
                    (item) => item.tokenId === token.token
                );
                if (
                    Math.floor(
                        token.count *
                        Math.pow(10, Number(tokenConfig?.decimals))
                    ) <= 0
                ) {
                    return {
                        lessThanZero: {
                            valid: false,
                        },
                    };
                }
            }
            return null;
        };
    }

    get selectedTokenId(): string | null {
        return this.form.get('token')?.value || null;
    }
}
