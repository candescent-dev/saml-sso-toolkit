import { AuthSettingData } from '../../saml/types/authSetting.types';

export interface AppConfig extends AuthSettingData {
  frontendPort: number;
  backendPort: number;
}
