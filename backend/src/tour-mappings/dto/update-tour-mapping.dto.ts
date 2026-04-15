import { PartialType } from '@nestjs/mapped-types';
import { CreateTourMappingDto } from './create-tour-mapping.dto';

export class UpdateTourMappingDto extends PartialType(CreateTourMappingDto) {}