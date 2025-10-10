import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthFrontendUiLoginFormComponent } from './auth-frontend-ui-login-form.component';

describe('AuthFrontendUiLoginFormComponent', () => {
  let component: AuthFrontendUiLoginFormComponent;
  let fixture: ComponentFixture<AuthFrontendUiLoginFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthFrontendUiLoginFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthFrontendUiLoginFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
