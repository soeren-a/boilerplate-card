/* eslint-disable @typescript-eslint/no-explicit-any */
import { LitElement, html, TemplateResult, css, PropertyValues, CSSResultGroup, render } from 'lit';
import { customElement, property, state } from 'lit/decorators';
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from 'custom-card-helpers'; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import type { SettingsCardConfig } from './types';
import { actionHandler } from './action-handler-directive';
import { localize } from './localize/localize';
import { Settings } from './valve-settings';

import '@material/mwc-snackbar';

import './valve-settings';

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: 'settings-card-dev',
  name: 'Settings Card',
  description: 'A card to set the weekly schedule for Tuya Valves',
});

type StateSettings = {
  date?: string;
  attributes: Record<string, Settings>;
};

@customElement('settings-card-dev')
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import('./editor');
    return document.createElement('settings-card-editor');
  }

  public static getStubConfig(): Record<string, unknown> {
    return {
      isPanel: true,
    };
  }

  // https://lit.dev/docs/components/styles/
  static get styles(): CSSResultGroup {
    return css`
      :host {
        width: 100%;
      }

      sp-toast {
        position: fixed;
        top: 75%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 10;
      }
    `;
  }

  private toasts: TemplateResult[] = [];

  @property({ type: Object })
  private restoredSettings?: Record<string, Settings>;

  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: SettingsCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: SettingsCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize('common.invalid_configuration'));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: 'Heizung Tagesplan',
      ...config,
    };
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  public getCardSize(): number | Promise<number> {
    return 1;
  }

  public connectedCallback(): void {
    super.connectedCallback();

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.type = 'text/css';
    link.crossOrigin = 'anonymous';
    link.href = 'https://fonts.googleapis.com/css?family=Material+Icons&display=block';
    document.head.appendChild(link);

    this.getSettings().then((settings) => {
      this.restoredSettings = settings?.attributes;
    });
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false) || changedProps.has('restoredSettings');
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this.showWarning(localize('common.show_warning'));
    }

    if (this.config.show_error) {
      return this.showError(localize('common.show_error'));
    }

    return html`
      <ha-card
        .header=${this.config.name}
        @action=${this.handleAction}
        .actionHandler=${actionHandler({
          hasHold: hasAction(this.config.hold_action),
          hasDoubleClick: hasAction(this.config.double_tap_action),
        })}
        tabindex="0"
        .label=${`Settings: ${this.config.entity || 'No Entity Defined'}`}
      >
        <valve-settings
          .settings=${this.restoredSettings}
          @saved=${(event: CustomEvent): void => {
            const valveSettings = JSON.parse(event.detail.message) as Settings;

            this.hass
              .callService('mqtt', 'publish', {
                topic: `zigbee2mqtt/${valveSettings.name}/set`,
                payload: `${JSON.stringify(valveSettings.payload)}`,
              })
              .then(() => {
                this.saveSettings(valveSettings).then((success) => {
                  if (success) {
                    console.log(
                      `Service successfully called [domain: mqtt, service: publish, topic: zigbee2mqtt/${valveSettings.name}/set]`,
                    );
                    this.showToast('Änderungen gespeichert.');
                  } else {
                    this.showToast('Änderungen konnten nicht gespeichert werden.');
                  }
                });
              });
          }}
        >
        </valve-settings>
      </ha-card>
    `;
  }

  private async getSettings(): Promise<StateSettings | undefined> {
    console.log('getting schedule');
    // const settings =  await this.hass.callApi("GET", "states/valve.settings");
    const settings = await this.hass.callWS({ type: 'saver/get_json' });
    return settings as StateSettings;
  }

  private async saveSettings(settings: Settings): Promise<boolean> {
    console.log('saving schedule');
    const storedSettings: StateSettings = (await this.hass.callWS({ type: 'saver/get_json' })) || { attributes: {} };

    storedSettings.attributes[settings.name] = settings;
    storedSettings.date = new Date().toString();

    await this.hass.sendWS({ type: 'saver/set_json', data: storedSettings });

    //return this.hass.callApi("POST", "states/valve.settings", storedSettings)
    return true;
  }

  private async deleteSettings(): Promise<boolean> {
    console.log('deleting schedule');
    /*return this.hass.callApi("POST", "states/valve.settings", {
        "state": "empty",
        "attributes": undefined
    })*/
    await this.hass.sendWS({ type: 'saver/set_json', data: {} });

    return true;
  }

  private handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private showToast(message: string): void {
    const element = this.shadowRoot?.querySelector('ha-card') as HTMLElement;
    if (element) {
      this.toasts.push(html` <mwc-snackbar open closeOnEscape labelText=${message}></mwc-snackbar> `);
      render(this.toasts, element);
    }
  }

  private showWarning(warning: string): TemplateResult {
    return html`<hui-warning>${warning}</hui-warning> `;
  }

  private showError(error: string): TemplateResult {
    const errorCard = document.createElement('hui-error-card');
    errorCard.setConfig({
      type: 'error',
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }
}
