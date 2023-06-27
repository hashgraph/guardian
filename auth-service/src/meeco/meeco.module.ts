import { Module } from '@nestjs/common';
import { MeecoService } from './meeco.service';

@Module({
  providers: [MeecoService],
  exports: [MeecoService],
})
export class MeecoModule {
  static forRoot(configs, passphrase) {
    return {
      module: MeecoModule,
      providers: [
        {
          provide: MeecoService,
          useFactory: () => new MeecoService(configs, passphrase),
        },
      ],
    };
  }
}
