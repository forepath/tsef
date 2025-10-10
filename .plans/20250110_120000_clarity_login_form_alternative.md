# Feature Plan

> **Plan file location:** `.plans/20250110_120000_clarity_login_form_alternative.md`

---

## 1. Overview

**Feature Name:**
Clarity Design System Login Form Alternative

**Date:**
2025-01-10

**Author(s):**
AI Assistant

**Related Issue(s) / RFC(s):**
N/A - Feature request for design system alternative

**Summary:**
Create a standalone login form component library using Clarity Design System (`@clr/angular`) components. This will provide teams using Clarity Design System with a reusable, accessible login form component that can be integrated into any Angular application without dependencies on existing auth domain libraries.

---

## 2. Assessment

- **Relevant Documentation & Guidelines Reviewed:**
  - Domain and Library Guidelines
  - Application Guidelines
  - Software Development Principles
  - Existing auth domain structure and patterns
  - Clarity Design System (`@clr/angular`) documentation and components

- **Affected Applications:**
  - Angular applications using Clarity Design System (`@clr/angular`)

- **Affected Domains:**
  - None (standalone component library)

- **Affected Libraries:**
  - New standalone library: `clarity-login-form`

- **Existing Issues / Related Work:**
  - Current Bootstrap-based login form in `auth-frontend-ui-login-form` (reference only)
  - Clarity Design System documentation and examples

- **Dependency & Modularity Alignment:**
  - Standalone library with minimal dependencies
  - Uses only `@clr/angular` and Angular core modules
  - No dependencies on existing auth domain libraries
  - Self-contained validation and type definitions

- **Stakeholder Consultation:**
  - N/A - Internal feature addition

---

## 3. Planning

### 3.1. Tasks & Subcomponents

| Task/Subcomponent                 | Description                                                 | Location (app/domain/lib)                            | Owner        | Notes                                   |
| --------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------- | ------------ | --------------------------------------- |
| Create standalone Clarity library | Generate new library using @forepath/devkit:lib             | `libs/clarity-login-form`                            | AI Assistant | Use angular generator                   |
| Implement login form component    | Create component using Clarity Design System components     | `libs/clarity-login-form/src/lib/clarity-login-form` | AI Assistant | Self-contained with own types           |
| Create HTML template              | Build template using clr-input, clr-password, clr-button    | `libs/clarity-login-form/src/lib/clarity-login-form` | AI Assistant | Use Clarity form components             |
| Add SCSS styling                  | Create component-specific styles following Clarity patterns | `libs/clarity-login-form/src/lib/clarity-login-form` | AI Assistant | Minimal custom styling, rely on Clarity |
| Implement unit tests              | Create comprehensive test suite                             | `libs/clarity-login-form/src/lib/clarity-login-form` | AI Assistant | Test component behavior and validation  |
| Create standalone documentation   | Document standalone component usage                         | `libs/clarity-login-form/README.md`                  | AI Assistant | Usage examples and integration guide    |

### 3.2. Nx Generators & Tooling

- **Generators to Use:**
  - `@forepath/devkit:lib` with `generator: angular` for creating the new library
  - Manual component implementation following Clarity Design System (`@clr/angular`) patterns

- **Manual Steps (if any):**
  - Component implementation with Clarity (`@clr/angular`) components
  - Template creation using clr-\* components
  - Test implementation
  - Documentation updates

### 3.3. Structure & Naming

- **Applications:**
  - No changes to applications

- **Domains:**
  - No changes to domain structure

- **Libraries:**
  - New standalone library: `clarity-login-form`
  - Component: `ClarityLoginFormComponent`
  - Selector: `clarity-login-form`
  - Self-contained with own types and validation

### 3.4. Issue / RFC Update

- **Issue/RFC to Update or Create:**
  - N/A - Internal feature addition

### 3.5. Test Coverage, Documentation, Validation

- **Test Coverage Plan:**
  - Unit tests for component behavior
  - Form validation testing
  - Input/output event testing
  - Error handling testing
  - Loading state testing
  - Accessibility testing

- **Documentation Plan:**
  - Create standalone README.md for the component library
  - Add usage examples and integration guide
  - Document component API and configuration options
  - Include setup instructions for Clarity Design System (`@clr/angular`)

- **Validation Steps:**
  - Build and test new library
  - Verify component functionality and API
  - Test standalone integration examples
  - Validate accessibility compliance
  - Run linting and formatting

### 3.6. Backward Compatibility

- **Considerations:**
  - No breaking changes to existing libraries
  - Standalone component with no dependencies on existing auth domain
  - Self-contained library that can be used independently
  - Clear API for easy integration into any Angular application

---

## 4. Confirmation

- **Confirmation Required From:**
  - Development team for component API design
  - Design team for Clarity component usage

- **Blocking Questions / Open Items:**
  - Confirm Clarity Design System (`@clr/angular`) version compatibility
  - Verify component naming conventions
  - Confirm standalone component requirements

---

## 5. Appendix (Optional)

- **Diagrams / Visuals:**
  - Component architecture diagram showing relationship between Bootstrap and Clarity versions
  - API comparison table

- **References:**
  - [Clarity Design System Documentation](https://clarity.design/)
  - [Clarity Angular Components (`@clr/angular`)](https://clarity.design/documentation/angular-components)
  - Existing Bootstrap login form implementation (reference only)
  - Angular Reactive Forms documentation

---

## 6. Implementation Details

### 6.1. Component API Design

The new `ClarityLoginFormComponent` will provide a clean, self-contained API:

**Inputs:**

- `loading: boolean = false`
- `error: string | null = null`
- `allowEmailLogin: boolean = true`
- `allowUsernameLogin: boolean = true`
- `showRememberMe: boolean = true`
- `submitButtonText: string = 'Login'`
- `usernameLabel: string = 'Username'`
- `passwordLabel: string = 'Password'`
- `rememberMeLabel: string = 'Remember me'`

**Outputs:**

- `loginSubmit: EventEmitter<LoginRequest>`
- `errorClear: EventEmitter<void>`

### 6.2. Clarity Components Usage

**Form Structure:**

```html
<form [formGroup]="loginForm" (ngSubmit)="onSubmit()">
  <!-- Error Message -->
  <clr-alert *ngIf="error" [clrAlertType]="'danger'" [clrAlertClosable]="true" (clrAlertClosedChange)="onClearError()">
    <clr-alert-item>
      <span class="alert-text">{{ error }}</span>
    </clr-alert-item>
  </clr-alert>

  <!-- Username/Email Field -->
  <clr-input-container>
    <label>{{ usernameLabel }}</label>
    <input clrInput formControlName="username" type="text" placeholder="Enter your username or email" [disabled]="loading" />
    <clr-control-error *ngIf="getFieldError('username')">{{ getFieldError('username') }}</clr-control-error>
  </clr-input-container>

  <!-- Password Field -->
  <clr-password-container>
    <label>{{ passwordLabel }}</label>
    <input clrPassword formControlName="password" placeholder="Enter your password" [disabled]="loading" />
    <clr-control-error *ngIf="getFieldError('password')">{{ getFieldError('password') }}</clr-control-error>
  </clr-password-container>

  <!-- Remember Me Checkbox -->
  <clr-checkbox-container *ngIf="showRememberMe">
    <clr-checkbox-wrapper>
      <input type="checkbox" clrCheckbox formControlName="rememberMe" [disabled]="loading" />
      <label>{{ rememberMeLabel }}</label>
    </clr-checkbox-wrapper>
  </clr-checkbox-container>

  <!-- Submit Button -->
  <button type="submit" class="btn btn-primary" [disabled]="loginForm.invalid || loading">
    <span *ngIf="loading" class="spinner spinner-sm"></span>
    {{ submitButtonText }}
  </button>
</form>
```

### 6.3. Dependencies

**Required Clarity Dependencies:**

- `@clr/angular` - Clarity Angular components
- `@clr/icons` - Clarity icons (optional, for enhanced UI)

**Existing Dependencies:**

- Angular Reactive Forms
- Angular Common Module
- Self-contained types and validation utilities

### 6.4. File Structure

```
libs/clarity-login-form/
├── src/
│   ├── lib/
│   │   ├── clarity-login-form/
│   │   │   ├── clarity-login-form.component.ts
│   │   │   ├── clarity-login-form.component.html
│   │   │   ├── clarity-login-form.component.scss
│   │   │   └── clarity-login-form.component.spec.ts
│   │   ├── types/
│   │   │   ├── login-form.types.ts
│   │   │   └── login-form.types.spec.ts
│   │   └── validation/
│   │       ├── login-form.validation.ts
│   │       └── login-form.validation.spec.ts
│   └── index.ts
├── project.json
├── tsconfig.json
├── tsconfig.lib.json
├── tsconfig.spec.json
├── jest.config.ts
├── .eslintrc.json
└── README.md
```

### 6.5. Testing Strategy

**Unit Tests:**

- Component initialization
- Form validation
- Input/output events
- Error handling
- Loading states
- Accessibility attributes

**Integration Tests:**

- Form submission flow
- Validation error display
- Error clearing
- Remember me functionality
- Standalone component integration

**Accessibility Tests:**

- ARIA attributes
- Keyboard navigation
- Screen reader compatibility
- Focus management

---

## 7. Integration Guide

### 7.1. Standalone Component Integration

**Step 1: Install Clarity Dependencies**

```bash
npm install @clr/angular @clr/icons
```

**Step 2: Import Component**

```typescript
import { ClarityLoginFormComponent } from '@clarity-login-form';
```

**Step 3: Use Component in Template**

```html
<clarity-login-form [loading]="loading" [error]="error" (loginSubmit)="onLogin($event)" (errorClear)="onClearError()"> </clarity-login-form>
```

**Step 4: Add Clarity Styles**

```typescript
// In angular.json
"styles": [
  "node_modules/@clr/angular/clr-angular.min.css",
  "src/styles.css"
]
```

**Step 5: Import Clarity Module**

```typescript
// In app.module.ts or feature module
import { ClarityModule } from '@clr/angular';

@NgModule({
  imports: [
    ClarityModule,
    // ... other imports
  ],
  // ...
})
export class AppModule {}
```

### 7.2. Component API

The standalone component provides a clean, self-contained API that can be easily integrated into any Angular application:

```typescript
interface LoginFormData {
  username: string;
  password: string;
  rememberMe: boolean;
}

interface LoginFormConfig {
  loading?: boolean;
  error?: string | null;
  allowEmailLogin?: boolean;
  allowUsernameLogin?: boolean;
  showRememberMe?: boolean;
  submitButtonText?: string;
  usernameLabel?: string;
  passwordLabel?: string;
  rememberMeLabel?: string;
}
```

---

## 8. Success Criteria

- [ ] New standalone Clarity login form library created
- [ ] Component provides clean, self-contained API
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Accessibility compliance verified
- [ ] Standalone documentation created
- [ ] Build and lint validation successful
- [ ] Integration guide provided
- [ ] Example usage documented

---

## 9. Timeline

**Estimated Duration:** 2-3 hours

**Tasks Breakdown:**

- Library generation: 15 minutes
- Component implementation: 45 minutes
- Template creation: 30 minutes
- Types and validation: 30 minutes
- Testing: 45 minutes
- Documentation: 30 minutes
- Validation: 15 minutes

**Total:** ~3 hours

---

## 10. Risks and Mitigation

**Risk 1: Clarity Design System (`@clr/angular`) Version Compatibility**

- _Mitigation:_ Use latest stable version and document version requirements

**Risk 2: API Design Complexity**

- _Mitigation:_ Keep API simple and self-contained with clear interfaces

**Risk 3: Accessibility Compliance**

- _Mitigation:_ Leverage Clarity's built-in accessibility features and test thoroughly

**Risk 4: Performance Impact**

- _Mitigation:_ Use Clarity's optimized components and lazy loading where appropriate

---

## 11. Future Enhancements

- Additional Clarity (`@clr/angular`) form components (registration, password reset)
- Clarity-specific theming options
- Advanced validation patterns using Clarity components
- Integration with Clarity's design tokens
- Storybook stories for Clarity components

---

## 12. Conclusion

This plan provides a comprehensive approach to creating a standalone Clarity Design System (`@clr/angular`) login form component. The implementation provides a self-contained, reusable component that can be integrated into any Angular application without dependencies on existing auth domain libraries. The solution leverages Clarity's modern, accessible components while maintaining a clean, simple API.

The plan follows established monorepo patterns, creates a standalone library, and provides clear integration paths for teams adopting Clarity Design System (`@clr/angular`).
