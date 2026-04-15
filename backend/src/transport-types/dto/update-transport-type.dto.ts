import { PartialType } from '@nestjs/mapped-types';
import { CreateTransportTypeDto } from './create-transport-type.dto';

export class UpdateTransportTypeDto extends PartialType(CreateTransportTypeDto) {}