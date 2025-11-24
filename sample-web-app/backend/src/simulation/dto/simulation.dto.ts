import { IsString, IsNotEmpty, IsEmail, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO representing user attributes for SAML assertion.
 * Ensures all fields are properly validated and strictly typed.
 */
export class AttributesDto {
  /** User's first name */
  @IsString()
  @IsNotEmpty()
  public readonly firstName!: string;

  /** User's last name */
  @IsString()
  @IsNotEmpty()
  public readonly lastName!: string;

  /** Unique member ID for the user */
  @IsString()
  @IsNotEmpty()
  public readonly memberId!: string;

  /** User's email address */
  @IsEmail()
  public readonly email!: string;
}

/**
 * Main DTO for /simulation endpoint.
 * Contains ACS URL, encryption public key, and user attributes.
 */
export class SimulationDto {
  /** Vendor's ACS endpoint */
  @IsString()
  @IsNotEmpty()
  public readonly acsUrl!: string;

  /** Vendor's public key for encryption */
  @IsString()
  @IsNotEmpty()
  public readonly encryptionPublicKey!: string;

  /** User attributes object */
  @ValidateNested()
  @Type(() => AttributesDto)
  public readonly attributes!: AttributesDto;
}
