import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class SamlQueryDto {
  @IsString()
  @IsNotEmpty()
  SAMLResponse: string;
}
