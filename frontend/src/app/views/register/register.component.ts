import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AuthStateService } from 'src/app/services/auth-state.service';
import { UserRole } from 'interfaces';

const checkPasswords: ValidatorFn = (group: AbstractControl): ValidationErrors | null => {
    let pass = group.get('password');
    let confirmPass = group.get('confirmPassword');
    return (
        pass && confirmPass &&
        pass.value === confirmPass.value
    ) ? null : { notSame: true };
}

@Component({
    selector: 'app-register',
    templateUrl: './register.component.html',
    styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {
    loading: boolean = false;

    loginForm = this.fb.group({
        login: ['Installer', Validators.required],
        role: ['INSTALLER', Validators.required],
        password: ['test', Validators.required],
        confirmPassword: ['test', Validators.required],
    }, { validators: checkPasswords });

    constructor(
        private auth: AuthService,
        private authState: AuthStateService,
        private fb: FormBuilder,
        private route: ActivatedRoute,
        private router: Router) { }

    ngOnInit() {
        this.loading = false;
    }

    signup() {
        if (this.loginForm.valid) {
            const d = this.loginForm.value;
            this.loading = true;
            this.auth.createUser(d.login, d.password, d.role).subscribe((result) => {
                this.auth.login(d.login, d.password).subscribe((result) => {
                    this.loading = false;
                    localStorage.setItem('accessToken', result.accessToken);
                    this.authState.updateState(true);
                    if (result.role == UserRole.ROOT_AUTHORITY) {
                        this.router.navigate(['/config']);
                    } else {
                        this.router.navigate(['/']);
                    }
                }, (error) => {
                    this.loading = false;
                })
            }, (error) => {
                this.loading = false;
            })
        }
    }

    goBack(): void {
        this.router.navigate(['/login']);
    }
}