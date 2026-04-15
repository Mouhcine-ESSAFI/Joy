import { IsString, IsNumber, IsNotEmpty, ValidateIf } from 'class-validator';

export class CreateSupplementDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsNumber()
  @ValidateIf((o) => o.amount !== 0, {
    message: 'Amount cannot be zero',
  })
  amount: number;
}