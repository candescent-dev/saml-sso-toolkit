export interface UserAttributes {
  firstName: string;
  lastName: string;
  memberId: string;
  email: string;
}

export interface ApiSuccessResponse {
  success: true;
  acsUrl: string;
  publicCertificate: string;
  xml: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errorCode?: string;
  errorReason?: string;
}

export interface HomeInputState {
  acsUrl: string;
  publicCertificate: string;
  attributes: UserAttributes;
}

export interface HomeState extends HomeInputState {
  xml: string | null;
  loading: boolean;
  error: string | null;
}
