import type { IDEPreset } from '@/types';

import vscodeIcon from '@/assets/ide-icons/vscode.svg';
import cursorIcon from '@/assets/ide-icons/cursor.svg';
import intellijIcon from '@/assets/ide-icons/intellij.svg';
import webstormIcon from '@/assets/ide-icons/webstorm.svg';
import pycharmIcon from '@/assets/ide-icons/pycharm.svg';
import golandIcon from '@/assets/ide-icons/goland.svg';
import customIcon from '@/assets/ide-icons/custom.svg';

export interface IDEInfo {
  id: IDEPreset;
  name: string;
  icon: string;
}

export const ideConfigs: Record<IDEPreset, IDEInfo> = {
  code: { id: 'code', name: 'VS Code', icon: vscodeIcon },
  cursor: { id: 'cursor', name: 'Cursor', icon: cursorIcon },
  idea: { id: 'idea', name: 'IntelliJ IDEA', icon: intellijIcon },
  webstorm: { id: 'webstorm', name: 'WebStorm', icon: webstormIcon },
  pycharm: { id: 'pycharm', name: 'PyCharm', icon: pycharmIcon },
  goland: { id: 'goland', name: 'GoLand', icon: golandIcon },
  custom: { id: 'custom', name: 'Custom IDE', icon: customIcon },
};

export function getIDEInfo(preset: IDEPreset): IDEInfo {
  return ideConfigs[preset] || ideConfigs.code;
}

export function getIDEName(preset: IDEPreset): string {
  return ideConfigs[preset]?.name || preset;
}

// Array format for dropdowns
export const ideOptions: { id: IDEPreset; name: string }[] = [
  { id: 'code', name: 'VS Code' },
  { id: 'cursor', name: 'Cursor' },
  { id: 'idea', name: 'IntelliJ IDEA' },
  { id: 'webstorm', name: 'WebStorm' },
  { id: 'pycharm', name: 'PyCharm' },
  { id: 'goland', name: 'GoLand' },
  { id: 'custom', name: 'Custom' },
];
