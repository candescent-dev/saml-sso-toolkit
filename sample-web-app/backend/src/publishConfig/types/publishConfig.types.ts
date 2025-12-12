import { SamlSettingData } from '../../saml/types/samlSetting.types';

export interface AppConfig extends SamlSettingData {
  frontendPort: number;
  backendPort: number;
}
