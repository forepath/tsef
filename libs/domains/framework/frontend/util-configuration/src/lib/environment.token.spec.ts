import { FactoryProvider, InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { environment } from './environment';
import { Environment } from './environment.interface';
import { ENVIRONMENT, provideEnvironment } from './environment.token';

describe('environment.token', () => {
  describe('ENVIRONMENT', () => {
    it('should be an InjectionToken', () => {
      expect(ENVIRONMENT).toBeInstanceOf(InjectionToken);
    });

    it('should be typed as InjectionToken<Environment>', () => {
      // Type check: token should accept Environment type
      const testProvider = {
        provide: ENVIRONMENT,
        useValue: environment,
      };
      expect(testProvider.provide).toBe(ENVIRONMENT);
      expect(testProvider.useValue).toBeDefined();
    });
  });

  describe('provideEnvironment', () => {
    it('should return a Provider object', () => {
      const provider = provideEnvironment();
      expect(provider).toBeDefined();
      expect(typeof provider).toBe('object');
      expect(Array.isArray(provider)).toBe(false);
    });

    it('should provide ENVIRONMENT token', () => {
      const provider = provideEnvironment() as FactoryProvider;
      expect(provider.provide).toBe(ENVIRONMENT);
    });

    it('should use factory function', () => {
      const provider = provideEnvironment() as FactoryProvider;
      expect(provider.useFactory).toBeDefined();
      expect(typeof provider.useFactory).toBe('function');
    });

    it('should have empty deps array', () => {
      const provider = provideEnvironment() as FactoryProvider;
      expect(provider.deps).toEqual([]);
    });

    it('should return environment from factory', () => {
      const provider = provideEnvironment() as FactoryProvider;
      const factoryResult = provider.useFactory();
      expect(factoryResult).toBe(environment);
      expect(factoryResult).toMatchObject<Environment>({
        production: expect.any(Boolean),
        authentication: expect.any(Object),
      });
    });

    it('should be usable in TestBed configuration', async () => {
      await TestBed.configureTestingModule({
        providers: [provideEnvironment()],
      }).compileComponents();

      const injected = TestBed.inject(ENVIRONMENT);
      expect(injected).toBe(environment);
      expect(injected).toMatchObject<Environment>({
        production: expect.any(Boolean),
        authentication: expect.any(Object),
      });
    });

    it('should provide same instance on multiple injections', async () => {
      await TestBed.configureTestingModule({
        providers: [provideEnvironment()],
      }).compileComponents();

      const first = TestBed.inject(ENVIRONMENT);
      const second = TestBed.inject(ENVIRONMENT);
      expect(first).toBe(second);
      expect(first).toBe(environment);
    });

    it('should allow injection in service', async () => {
      class TestService {
        constructor(public env: Environment) {}
      }

      await TestBed.configureTestingModule({
        providers: [
          provideEnvironment(),
          {
            provide: TestService,
            useFactory: (env: Environment) => new TestService(env),
            deps: [ENVIRONMENT],
          },
        ],
      }).compileComponents();

      const service = TestBed.inject(TestService);
      expect(service.env).toBe(environment);
      expect(service.env).toMatchObject<Environment>({
        production: expect.any(Boolean),
        authentication: expect.any(Object),
      });
    });
  });
});
