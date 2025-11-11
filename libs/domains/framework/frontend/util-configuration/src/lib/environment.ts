import { Environment } from './environment.interface';

export const environment: Environment = {
  production: false,
  controller: {
    restApiUrl: 'http://localhost:3100/api',
    websocketUrl: 'http://localhost:8081/clients',
  },
  authentication: {
    type: 'api-key',
  },
};
