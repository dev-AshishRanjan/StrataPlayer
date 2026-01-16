
import React from 'react';
import { createRoot } from 'react-dom/client';
import { StrataPlayer } from './ui/StrataPlayer';
import { StrataCore, PlayerState, PlayerSource, StrataConfig, TextTrackConfig } from './core/StrataCore';
import { HlsPlugin } from './plugins/HlsPlugin';

// Export React Component
export { StrataPlayer };

// Export Core & Plugins for advanced usage
export { StrataCore, HlsPlugin };
export type { PlayerState, PlayerSource, StrataConfig, TextTrackConfig };

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
