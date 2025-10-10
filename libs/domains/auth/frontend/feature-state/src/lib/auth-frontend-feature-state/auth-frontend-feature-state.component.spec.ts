import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthFrontendFeatureStateComponent } from './auth-frontend-feature-state.component';

describe('AuthFrontendFeatureStateComponent', () => {
  let component: AuthFrontendFeatureStateComponent;
  let fixture: ComponentFixture<AuthFrontendFeatureStateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthFrontendFeatureStateComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(AuthFrontendFeatureStateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
