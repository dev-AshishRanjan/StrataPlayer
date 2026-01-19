
import './index.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrataPlayer } from './ui/StrataPlayer';
import {
  StrataCore,
  PlayerState,
  PlayerSource,
  StrataConfig,
  TextTrackConfig,
  IPlugin,
  SubtitleSettings,
  PlayerTheme,
  Highlight,
  LayerConfig,
  ContextMenuItem,
  ControlItem,
  SettingItem,
  Notification
} from './core/StrataCore';

// Export React Component
export { StrataPlayer };

// Export Core & Plugins for advanced usage
export { StrataCore };
export type {
  PlayerState,
  PlayerSource,
  StrataConfig,
  TextTrackConfig,
  IPlugin,
  SubtitleSettings,
  PlayerTheme,
  Highlight,
  LayerConfig,
  ContextMenuItem,
  ControlItem,
  SettingItem,
  Notification
};

// Export Vanilla JS / Framework Agnostic Mounting Helper
export interface StrataPlayerInstance {
  unmount: () => void;
  update: (props: any) => void;
}

export const mountStrataPlayer = (container: HTMLElement, props: any): StrataPlayerInstance => {
  const root = createRoot(container);

  // Initial Render
  root.render(React.createElement(StrataPlayer, props));

  return {
    unmount: () => {
      root.unmount();
    },
    update: (newProps: any) => {
      // Merge props or replace depending on needs, here we merge with original + new
      root.render(React.createElement(StrataPlayer, { ...props, ...newProps }));
    }
  };
};
