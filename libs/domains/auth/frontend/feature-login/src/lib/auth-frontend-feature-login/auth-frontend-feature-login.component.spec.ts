import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthFrontendFeatureLoginComponent } from './auth-frontend-feature-login.component';

describe('AuthFrontendFeatureLoginComponent', () => {
  let component: AuthFrontendFeatureLoginComponent;
  let fixture: ComponentFixture<AuthFrontendFeatureLoginComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthFrontendFeatureLoginComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthFrontendFeatureLoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
