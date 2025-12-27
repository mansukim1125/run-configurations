export interface RunConfiguration {
  id: string;
  name: string;
  command: string;
  args: string;
  env: Record<string, string>;
  cwd: string;
}

export interface RunConfigurationDto {
  id?: string;
  name: string;
  command: string;
  args?: string;
  env?: Record<string, string>;
  cwd?: string;
}

export function createConfiguration(dto: RunConfigurationDto): RunConfiguration {
  return {
    id: dto.id || generateId(),
    name: dto.name,
    command: dto.command,
    args: dto.args || '',
    env: dto.env || {},
    cwd: dto.cwd || '${workspaceFolder}'
  };
}

function generateId(): string {
  return `config-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}
