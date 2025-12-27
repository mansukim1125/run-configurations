import * as vscode from 'vscode';
import { RunConfiguration } from '../models/RunConfiguration';
import { ConfigurationStorageService } from '../services/ConfigurationStorageService';

export class RunConfigurationTreeDataProvider implements vscode.TreeDataProvider<RunConfigurationTreeItem> {
  private _onDidChangeTreeData = new vscode.EventEmitter<RunConfigurationTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private storageService: ConfigurationStorageService) {
    storageService.onDidChange(() => {
      this.refresh();
    });
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: RunConfigurationTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: RunConfigurationTreeItem): Promise<RunConfigurationTreeItem[]> {
    if (element) {
      return [];
    }

    const configurations = await this.storageService.getAll();
    return configurations.map(config => new RunConfigurationTreeItem(config));
  }
}

/**
 * 역할:
 * 1. TreeView 안 Item 마다 생성되는 객체.
 * 
 */
export class RunConfigurationTreeItem extends vscode.TreeItem {
  constructor(public readonly configuration: RunConfiguration) {
    super(configuration.name, vscode.TreeItemCollapsibleState.None);

    this.contextValue = 'runConfiguration';
    this.id = configuration.id;
    this.tooltip = this.buildTooltip();
    this.description = configuration.command;
  }

  private buildTooltip(): string {
    const config = this.configuration;
    const parts = [
      `Name: ${config.name}`,
      `Command: ${config.command}`,
    ];

    if (config.args) {
      parts.push(`Args: ${config.args}`);
    }

    if (config.cwd) {
      parts.push(`Working Dir: ${config.cwd}`);
    }

    const envCount = Object.keys(config.env).length;
    if (envCount > 0) {
      parts.push(`Environment Variables: ${envCount}`);
    }

    return parts.join('\n');
  }
}
