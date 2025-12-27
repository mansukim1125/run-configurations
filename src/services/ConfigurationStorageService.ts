import * as vscode from 'vscode';
import { RunConfiguration, createConfiguration, RunConfigurationDto } from '../models/RunConfiguration';

/**
 * 역할:
 * 1. vscode 내부에 저장되어 있는 configurations 를 가져온다.
 * 2. configuration 을 vscode configurations 에 저장한다.
 * 3. vscode 내부에 저장되어 있는 configurations 에서 특정 config 를 삭제한다.
 * 4. vscode 내부에 저장되어 있는 configurations 에서 특정 config 를 가져온다.
 */
export class ConfigurationStorageService {
  private static readonly CONFIG_KEY = 'runConfigurations.configurations';

  constructor() {}

  async getAll(): Promise<RunConfiguration[]> {
    const config = vscode.workspace.getConfiguration();
    const configs = config.get<RunConfigurationDto[]>(
      ConfigurationStorageService.CONFIG_KEY,
      []
    );
    return configs.map(createConfiguration);
  }

  async save(configuration: RunConfiguration): Promise<void> {
    const configs = await this.getAll();
    const index = configs.findIndex(c => c.id === configuration.id);

    if (index >= 0) {
      configs[index] = configuration;
    } else {
      configs.push(configuration);
    }

    await this.updateWorkspaceConfig(configs);
  }

  async delete(id: string): Promise<void> {
    const configs = await this.getAll();
    const filtered = configs.filter(c => c.id !== id);
    await this.updateWorkspaceConfig(filtered);
  }

  async getById(id: string): Promise<RunConfiguration | undefined> {
    const configs = await this.getAll();
    return configs.find(c => c.id === id);
  }

  private async updateWorkspaceConfig(configs: RunConfiguration[]): Promise<void> {
    const config = vscode.workspace.getConfiguration();
    await config.update(
      ConfigurationStorageService.CONFIG_KEY,
      configs,
      vscode.ConfigurationTarget.Workspace
    );
  }

  onDidChange(callback: () => void): vscode.Disposable {
    return vscode.workspace.onDidChangeConfiguration(e => {
      if (e.affectsConfiguration(ConfigurationStorageService.CONFIG_KEY)) {
        callback();
      }
    });
  }
}
