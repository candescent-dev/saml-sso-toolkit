import { TestResults } from '../../utils/xmlParser';

export interface SamlValidatorState {
  error: string | null;
  htmlFileUrl: string;
  xmlFileUrl: string;
  testResults: TestResults | null;
  runValidatorLoading: boolean;
  publishSamlSettingLoading: boolean;
}