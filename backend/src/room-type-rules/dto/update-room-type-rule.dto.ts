import { PartialType } from '@nestjs/mapped-types';
import { CreateRoomTypeRuleDto } from './create-room-type-rule.dto';

export class UpdateRoomTypeRuleDto extends PartialType(CreateRoomTypeRuleDto) {}