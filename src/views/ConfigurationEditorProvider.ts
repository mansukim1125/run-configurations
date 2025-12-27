import * as vscode from 'vscode';
import { RunConfiguration, createConfiguration } from '../models/RunConfiguration';
import { ConfigurationStorageService } from '../services/ConfigurationStorageService';

export class ConfigurationEditorProvider {
  private currentPanel?: vscode.WebviewPanel;

  constructor(
    private context: vscode.ExtensionContext,
    private storageService: ConfigurationStorageService
  ) {}

  async openEditor(configurationId?: string): Promise<void> {
    const configuration = configurationId
      ? await this.storageService.getById(configurationId)
      : undefined;

    if (this.currentPanel) {
      this.currentPanel.reveal(vscode.ViewColumn.One);
      this.currentPanel.webview.postMessage({
        type: 'load',
        configuration: configuration || this.createEmptyConfig()
      });
    } else {
      this.currentPanel = this.createWebviewPanel();
      this.currentPanel.webview.html = this.getWebviewContent(
        this.currentPanel.webview
      );

      this.currentPanel.webview.onDidReceiveMessage(
        message => this.handleMessage(message),
        undefined,
        this.context.subscriptions
      );

      this.currentPanel.onDidDispose(
        () => {
          this.currentPanel = undefined;
        },
        undefined,
        this.context.subscriptions
      );

      this.currentPanel.webview.postMessage({
        type: 'load',
        configuration: configuration || this.createEmptyConfig()
      });
    }
  }

  private createWebviewPanel(): vscode.WebviewPanel {
    return vscode.window.createWebviewPanel(
      'runConfigurationEditor',
      'Edit Configuration',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );
  }

  private async handleMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'save':
        await this.handleSave(message.configuration);
        break;
      case 'cancel':
        this.currentPanel?.dispose();
        break;
    }
  }

  private async handleSave(configDto: any): Promise<void> {
    try {
      const configuration = createConfiguration(configDto);
      await this.storageService.save(configuration);

      vscode.window.showInformationMessage(
        `Configuration "${configuration.name}" saved successfully`
      );

      this.currentPanel?.dispose();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to save configuration: ${error}`
      );
    }
  }

  private createEmptyConfig(): Partial<RunConfiguration> {
    return {
      name: '',
      command: '',
      args: '',
      env: {},
      cwd: '${workspaceFolder}'
    };
  }

  private getWebviewContent(webview: vscode.Webview): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy"
          content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src ${webview.cspSource} 'unsafe-inline';">
    <title>Configuration Editor</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }

        h2 {
            margin-top: 0;
            margin-bottom: 24px;
            font-weight: 600;
        }

        .form-group {
            margin-bottom: 16px;
        }

        label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
        }

        input[type="text"],
        textarea {
            width: 100%;
            padding: 6px 8px;
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            outline: none;
            font-family: var(--vscode-font-family);
            box-sizing: border-box;
        }

        input[type="text"]:focus,
        textarea:focus {
            border-color: var(--vscode-focusBorder);
        }

        textarea {
            resize: vertical;
            min-height: 80px;
            font-family: var(--vscode-editor-font-family);
        }

        .env-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
        }

        .env-table th {
            text-align: left;
            padding: 8px;
            background-color: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-weight: 600;
        }

        .env-table td {
            padding: 4px;
        }

        .env-table input {
            width: 100%;
        }

        .button-group {
            margin-top: 24px;
            display: flex;
            gap: 8px;
        }

        button {
            padding: 8px 16px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            cursor: pointer;
            font-family: var(--vscode-font-family);
        }

        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }

        button.secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        button.secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .add-env-button {
            margin-top: 8px;
            font-size: 12px;
            padding: 4px 8px;
        }

        .remove-button {
            padding: 2px 6px;
            font-size: 11px;
        }
    </style>
</head>
<body>
    <h2>Run Configuration</h2>

    <div class="form-group">
        <label for="name">Name *</label>
        <input type="text" id="name" required placeholder="e.g., Run Backend Server">
    </div>

    <div class="form-group">
        <label for="command">Command *</label>
        <input type="text" id="command" required placeholder="e.g., npm, python, mvn">
    </div>

    <div class="form-group">
        <label for="args">Arguments</label>
        <textarea id="args" placeholder="Space-separated arguments (e.g., start --port 3000)"></textarea>
    </div>

    <div class="form-group">
        <label for="cwd">Working Directory</label>
        <input type="text" id="cwd" placeholder="\${workspaceFolder}">
    </div>

    <div class="form-group">
        <label>Environment Variables</label>
        <table class="env-table">
            <thead>
                <tr>
                    <th style="width: 35%">Key</th>
                    <th style="width: 55%">Value</th>
                    <th style="width: 10%"></th>
                </tr>
            </thead>
            <tbody id="env-table-body">
            </tbody>
        </table>
        <button class="add-env-button secondary" onclick="addEnvRow()">Add Variable</button>
    </div>

    <div class="button-group">
        <button onclick="save()">Save</button>
        <button class="secondary" onclick="cancel()">Cancel</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let currentConfig = null;

        window.addEventListener('message', event => {
            const message = event.data;
            if (message.type === 'load') {
                loadConfiguration(message.configuration);
            }
        });

        function loadConfiguration(config) {
            currentConfig = config;
            document.getElementById('name').value = config.name || '';
            document.getElementById('command').value = config.command || '';
            document.getElementById('args').value = config.args || '';
            document.getElementById('cwd').value = config.cwd || '\${workspaceFolder}';

            const tbody = document.getElementById('env-table-body');
            tbody.innerHTML = '';

            if (config.env) {
                for (const [key, value] of Object.entries(config.env)) {
                    addEnvRow(key, value);
                }
            }

            if (!config.env || Object.keys(config.env).length === 0) {
                addEnvRow();
            }
        }

        function addEnvRow(key = '', value = '') {
            const tbody = document.getElementById('env-table-body');
            const row = tbody.insertRow();

            const keyCell = row.insertCell(0);
            const valueCell = row.insertCell(1);
            const actionCell = row.insertCell(2);

            keyCell.innerHTML = '<input type="text" class="env-key" value="' + escapeHtml(key) + '" placeholder="KEY">';
            valueCell.innerHTML = '<input type="text" class="env-value" value="' + escapeHtml(value) + '" placeholder="value">';
            actionCell.innerHTML = '<button class="secondary remove-button" onclick="removeEnvRow(this)">Remove</button>';
        }

        function removeEnvRow(button) {
            const row = button.parentElement.parentElement;
            row.remove();
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function save() {
            const name = document.getElementById('name').value.trim();
            const command = document.getElementById('command').value.trim();

            if (!name || !command) {
                alert('Name and Command are required');
                return;
            }

            const args = document.getElementById('args').value;
            const cwd = document.getElementById('cwd').value.trim();

            const env = {};
            const envRows = document.querySelectorAll('#env-table-body tr');
            envRows.forEach(row => {
                const key = row.querySelector('.env-key').value.trim();
                const value = row.querySelector('.env-value').value;
                if (key) {
                    env[key] = value;
                }
            });

            const configuration = {
                id: currentConfig?.id,
                name,
                command,
                args,
                cwd,
                env
            };

            vscode.postMessage({
                type: 'save',
                configuration
            });
        }

        function cancel() {
            vscode.postMessage({ type: 'cancel' });
        }
    </script>
</body>
</html>`;
  }
}
