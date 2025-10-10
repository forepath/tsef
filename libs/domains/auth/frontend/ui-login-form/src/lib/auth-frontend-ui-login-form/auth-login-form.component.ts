import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { LoginRequest, LoginResponse, ValidationError } from '@auth/shared/util-types';
import { validateEmail, validatePassword, validateUsername, ValidationResult } from '@auth/shared/util-validation';

@Component({
  selector: 'auth-login-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './auth-frontend-ui-login-form.component.html',
  styleUrl: './auth-frontend-ui-login-form.component.scss',
})
export class AuthLoginFormComponent implements OnInit, OnDestroy {
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() allowEmailLogin = true;
  @Input() allowUsernameLogin = true;
  @Input() showRememberMe = true;
  @Input() submitButtonText = 'Login';
  @Input() usernameLabel = 'Username';
  @Input() passwordLabel = 'Password';
  @Input() rememberMeLabel = 'Remember me';

  @Output() loginSubmit = new EventEmitter<LoginRequest>();
  @Output() errorClear = new EventEmitter<void>();

  loginForm: FormGroup;
  private destroy$ = new Subject<void>();
  private validationErrors: { [key: string]: string } = {};

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required]],
      password: ['', [Validators.required]],
      rememberMe: [false],
    });
  }

  ngOnInit(): void {
    // Watch for form changes to clear errors
    this.loginForm.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      if (this.error) {
        this.errorClear.emit();
      }
      this.clearValidationErrors();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const formValue = this.loginForm.value;

      // Validate the form data
      const validation = this.validateForm(formValue);

      if (validation.isValid) {
        const loginRequest: LoginRequest = {
          username: formValue.username,
          password: formValue.password,
          rememberMe: formValue.rememberMe,
        };

        this.loginSubmit.emit(loginRequest);
      } else {
        this.setValidationErrors(validation.errors);
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  onClearError(): void {
    this.errorClear.emit();
  }

  getFieldError(fieldName: string): string | null {
    const field = this.loginForm.get(fieldName);
    if (field && field.invalid && (field.dirty || field.touched)) {
      if (field.errors?.['required']) {
        return `${this.getFieldLabel(fieldName)} is required`;
      }
      if (field.errors?.['email']) {
        return 'Invalid email format';
      }
    }

    return this.validationErrors[fieldName] || null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  private validateForm(formValue: any): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate username/email
    if (formValue.username) {
      let validation: ValidationResult;

      if (this.isEmail(formValue.username)) {
        validation = validateEmail(formValue.username);
      } else {
        validation = validateUsername(formValue.username);
      }

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    // Validate password
    if (formValue.password) {
      const validation = validatePassword(formValue.password, {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
      });

      if (!validation.isValid) {
        errors.push(...validation.errors);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private isEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  }

  private setValidationErrors(errors: ValidationError[]): void {
    this.validationErrors = {};

    errors.forEach((error) => {
      if (error.field === 'username' || error.field === 'email') {
        this.validationErrors['username'] = error.message;
      } else if (error.field === 'password') {
        this.validationErrors['password'] = error.message;
      }
    });
  }

  private clearValidationErrors(): void {
    this.validationErrors = {};
  }

  private markFormGroupTouched(): void {
    Object.keys(this.loginForm.controls).forEach((key) => {
      const control = this.loginForm.get(key);
      control?.markAsTouched();
    });
  }

  private getFieldLabel(fieldName: string): string {
    switch (fieldName) {
      case 'username':
        return this.usernameLabel;
      case 'password':
        return this.passwordLabel;
      default:
        return fieldName;
    }
  }
}
