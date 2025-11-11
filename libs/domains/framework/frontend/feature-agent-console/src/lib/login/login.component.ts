import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthenticationFacade } from '@forepath/framework/frontend/data-access-agent-console';
import type { Environment } from '@forepath/framework/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/framework/frontend/util-configuration';
import { Observable } from 'rxjs';

@Component({
  selector: 'framework-agent-console-login',
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  styleUrls: ['./login.component.scss'],
  templateUrl: './login.component.html',
  standalone: true,
})
export class AgentConsoleLoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly authFacade = inject(AuthenticationFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);

  loginForm!: FormGroup;
  loading$: Observable<boolean> = this.authFacade.loading$;
  error$: Observable<string | null> = this.authFacade.error$;

  /**
   * Get the API base hostname from the environment configuration.
   * Extracts only the hostname and port (without protocol or path).
   */
  get apiBaseHostname(): string {
    const apiUrl = this.environment.controller?.restApiUrl || 'http://localhost:3100/api';
    try {
      const url = new URL(apiUrl);
      return url.host;
    } catch {
      // Fallback if URL parsing fails - try to extract hostname manually
      const match = apiUrl.match(/\/\/([^/]+)/);
      return match ? match[1] : apiUrl;
    }
  }

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      apiKey: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      const apiKey = this.loginForm.get('apiKey')?.value;
      this.authFacade.login(apiKey);
    } else {
      // Mark all fields as touched to show validation errors
      Object.keys(this.loginForm.controls).forEach((key) => {
        this.loginForm.get(key)?.markAsTouched();
      });
    }
  }
}
