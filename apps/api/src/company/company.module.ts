import { Module } from '@nestjs/common';
import {
  CompanyController,
  CompanyPublicController,
} from './company.controller';
import { CompanyService } from './company.service';
import { CompanyGuard } from '../common/guards/company.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  controllers: [CompanyPublicController, CompanyController],
  providers: [CompanyService, JwtAuthGuard, CompanyGuard, RolesGuard],
})
export class CompanyModule {}
