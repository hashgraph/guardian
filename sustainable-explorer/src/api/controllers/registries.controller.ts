import { Controller, Get, Param, Query } from '@nestjs/common';
import { RegistriesService } from '../services/registries.service';
import { RegistryQueryDto } from '../dto/registry.dto';

@Controller('api/v1/registries')
export class RegistriesController {
    constructor(private readonly registriesService: RegistriesService) {}

    @Get()
    async findAll(@Query() query: RegistryQueryDto) {
        return this.registriesService.findAll(query);
    }

    @Get(':did')
    async findByDid(@Param('did') did: string) {
        return this.registriesService.findByDid(did);
    }
}
