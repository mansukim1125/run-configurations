import * as vscode from 'vscode';
import { RunConfigurationTreeDataProvider } from './providers/RunConfigurationTreeDataProvider';
import { ConfigurationStorageService } from './services/ConfigurationStorageService';
import { TerminalExecutionService } from './services/TerminalExecutionService';
import { ConfigurationEditorProvider } from './views/ConfigurationEditorProvider';

export function activate(context: vscode.ExtensionContext) {
  // Initialize services
  const storageService = new ConfigurationStorageService();
  const terminalService = new TerminalExecutionService();
  const editorProvider = new ConfigurationEditorProvider(context, storageService);

  // Initialize tree view
  const treeDataProvider = new RunConfigurationTreeDataProvider(storageService);
  const treeView = vscode.window.createTreeView('runConfigurations', {
    treeDataProvider,
    showCollapseAll: false
  });

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand('runConfigurations.add', async () => {
      await editorProvider.openEditor();
    }),

    vscode.commands.registerCommand('runConfigurations.run', async (item) => {
      if (item?.configuration) {
        await terminalService.execute(item.configuration);
      }
    }),

    vscode.commands.registerCommand('runConfigurations.edit', async (item) => {
      if (item?.configuration) {
        await editorProvider.openEditor(item.configuration.id);
      }
    }),

    vscode.commands.registerCommand('runConfigurations.delete', async (item) => {
      if (item?.configuration) {
        const confirmed = await vscode.window.showWarningMessage(
          `Delete configuration "${item.configuration.name}"?`,
          { modal: true },
          'Delete'
        );

        if (confirmed === 'Delete') {
          await storageService.delete(item.configuration.id);
        }
      }
    }),

    vscode.commands.registerCommand('runConfigurations.refresh', () => {
      treeDataProvider.refresh();
    })
  );

  // Register disposables
  context.subscriptions.push(treeView, terminalService);
}

export function deactivate() {
  // Cleanup handled by context.subscriptions
}
