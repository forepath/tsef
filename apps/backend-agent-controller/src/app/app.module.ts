import { ClientsModule } from '@forepath/framework/backend';
import { getHybridAuthGuards, KeycloakModule, KeycloakService } from '@forepath/identity/backend';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KeycloakConnectModule } from 'nest-keycloak-connect';
import { typeormConfig } from '../typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRoot(typeormConfig),
    KeycloakModule,
    KeycloakConnectModule.registerAsync({ useExisting: KeycloakService }),
    ClientsModule,
  ],
  // Use hybrid guards (checks STATIC_API_KEY to determine authentication method)
  providers: getHybridAuthGuards(),
})
export class AppModule {}
