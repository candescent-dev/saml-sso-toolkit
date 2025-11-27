export interface UserAttributes {
  firstName: string;
  lastName: string;
  memberId: string;
  email: string;
}

export interface HomeState {
  acsUrl: string;
  publicCertificate: string;
  attributes: UserAttributes;
}
