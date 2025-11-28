export interface AuthValidatorConfig {
  readonly acsUrl: string;
  readonly expectedAudience?: string;
  readonly expectedIssuer?: string;
  readonly allowedClockSkewMs: number;
  readonly privateKeyPath: string;
  readonly simulatorPublicCertPath: string;
}


