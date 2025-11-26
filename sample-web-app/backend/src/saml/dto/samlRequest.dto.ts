import { IsString, IsNotEmpty, IsEmail, ValidateNested, IsUrl } from 'class-validator';
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
  @IsNotEmpty()
  public readonly email!: string;
}

/**
 * Main DTO for /saml endpoint.
 * Contains ACS URL, encryption public certificate, and user attributes.
 */
export class SamlRequestDto {
  /** Vendor's ACS endpoint */
  @IsString()
  @IsNotEmpty()
  @IsUrl({
    require_protocol: true, // must have http/https
    require_tld: false, // allow localhost
  })
  public readonly acsUrl!: string;

  /** Vendor's public certificate for encryption */
  @IsString()
  @IsNotEmpty()
  public readonly publicCertificate!: string;

  /** User attributes object */
  @IsNotEmpty()
  @ValidateNested()
  @Type(() => AttributesDto)
  public readonly attributes!: AttributesDto;
}
