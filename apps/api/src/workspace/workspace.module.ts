import { Global, Module } from '@nestjs/common';
import { WorkspaceStore } from './workspace.store';

@Global()
@Module({
  providers: [WorkspaceStore],
  exports: [WorkspaceStore],
})
export class WorkspaceModule {}
