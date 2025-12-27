import * as vscode from 'vscode';
import { RunConfiguration } from '../models/RunConfiguration';

export class TerminalExecutionService {
  private terminals = new Map<string, vscode.Terminal>();

  constructor() {
    vscode.window.onDidCloseTerminal(terminal => {
      for (const [id, term] of this.terminals.entries()) {
        if (term === terminal) {
          this.terminals.delete(id);
          break;
        }
      }
    });
  }

  async execute(configuration: RunConfiguration): Promise<void> {
    const terminal = this.getOrCreateTerminal(configuration);
    terminal.show(true);

    const commandLine = this.buildCommandLine(configuration);
    terminal.sendText(commandLine);
  }

  private getOrCreateTerminal(configuration: RunConfiguration): vscode.Terminal {
    const existingTerminal = this.terminals.get(configuration.id);

    if (existingTerminal && this.isTerminalAlive(existingTerminal)) {
      return existingTerminal;
    }

    const cwd = this.resolveCwd(configuration.cwd);
    const env = this.prepareEnvironment(configuration.env);

    const terminal = vscode.window.createTerminal({
      name: `Run: ${configuration.name}`,
      cwd: cwd,
      env: env
    });

    this.terminals.set(configuration.id, terminal);
    return terminal;
  }

  private buildCommandLine(configuration: RunConfiguration): string {
    const parts = [configuration.command];

    if (configuration.args.trim()) {
      parts.push(configuration.args);
    }

    return parts.join(' ');
  }

  private resolveCwd(cwd: string): string | undefined {
    if (!cwd) {
      return undefined;
    }

    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
      return cwd.replace('${workspaceFolder}', workspaceFolders[0].uri.fsPath);
    }

    return cwd;
  }

  private prepareEnvironment(env: Record<string, string>): Record<string, string> {
    return { ...env };
  }

  private isTerminalAlive(terminal: vscode.Terminal): boolean {
    return vscode.window.terminals.includes(terminal);
  }

  dispose(): void {
    this.terminals.clear();
  }
}
