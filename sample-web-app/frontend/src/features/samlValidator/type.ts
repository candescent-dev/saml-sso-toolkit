export interface SamlValidatorState {
  error: string | null;
  htmlFileUrl: string;
  xmlFileUrl: string;
  runValidatorLoading: boolean;
  publishSamlSettingLoading: boolean;
}