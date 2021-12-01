/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
  render,
} from "lit";
import { customElement, property, state } from "lit/decorators";
import {
  HomeAssistant,
  hasConfigOrEntityChanged,
  hasAction,
  ActionHandlerEvent,
  handleAction,
  LovelaceCardEditor,
  getLovelace,
} from "custom-card-helpers"; // This is a community maintained npm module with common helper functions/types. https://github.com/custom-cards/custom-card-helpers

import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/src/themes.js";
import "@spectrum-web-components/toast/sp-toast.js";
import './valve-settings'
import "./editor";

import type { SettingsCardConfig } from "./types";
import { actionHandler } from "./action-handler-directive";
import { localize } from "./localize/localize";
import { Settings } from "./valve-settings";

/* eslint no-console: 0 */

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "settings-card",
  name: "Settings Card",
  description: "A card to set the weekly schedule for Tuya Valves (SEA802-Z01)",
});

@customElement("settings-card")
export class BoilerplateCard extends LitElement {
  public static async getConfigElement(): Promise<LovelaceCardEditor> {
    return document.createElement("settings-card-editor");
  }

  public static getStubConfig(): object {
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

  // https://lit.dev/docs/components/properties/
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private config!: SettingsCardConfig;

  // https://lit.dev/docs/components/properties/#accessors-custom
  public setConfig(config: SettingsCardConfig): void {
    // TODO Check for required fields and that they are of the proper format
    if (!config) {
      throw new Error(localize("common.invalid_configuration"));
    }

    if (config.test_gui) {
      getLovelace().setEditMode(true);
    }

    this.config = {
      name: "Heizung Tagesplan",
      ...config,
    };
  }

  // The height of your card. Home Assistant uses this to automatically
  // distribute all cards over the available columns.
  public getCardSize(): number | Promise<number> {
    return 1;
  }

  // https://lit.dev/docs/components/lifecycle/#reactive-update-cycle-performing
  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (!this.config) {
      return false;
    }

    return hasConfigOrEntityChanged(this, changedProps, false);
  }

  // https://lit.dev/docs/components/rendering/
  protected render(): TemplateResult | void {
    // TODO Check for stateObj or other necessary things and render a warning if missing
    if (this.config.show_warning) {
      return this.showWarning(localize("common.show_warning"));
    }

    if (this.config.show_error) {
      return this.showError(localize("common.show_error"));
    }

    return html`
      <sp-theme color="light" scale="medium">
        <ha-card
          .header=${this.config.name}
          @action=${this.handleAction}
          .actionHandler=${actionHandler({
            hasHold: hasAction(this.config.hold_action),
            hasDoubleClick: hasAction(this.config.double_tap_action),
          })}
          tabindex="0"
          .label=${`Settings: ${this.config.entity || "No Entity Defined"}`}
        >
          <valve-settings @saved=${(event: CustomEvent): void => {
            const valveSettings = JSON.parse(event.detail.message) as Settings

            /*
              // test save as state
              this.saveSettings(valveSettings).then(async saved => {
              console.log(saved)
              const result = await this.getSettings()
              console.log(result)
              // test end
            })*/

            this.hass.callService('mqtt', 'publish', {
              topic: `zigbee2mqtt/${valveSettings.name}/set`,
              payload: `${JSON.stringify(valveSettings.payload)}`
            }).then(() => {
              console.log(`Service successfully called [domain: mqtt, service: publish, topic: zigbee2mqtt/${valveSettings.name}/set]`)
              this.showSuccessToast('Änderungen gespeichert');
            })
          }}></valve-settings>
        </ha-card>
      </sp-theme>
    `;
  }

  private async getSettings(): Promise<Map<string, Settings>> {
    console.log('getting schedule')
    const { attributes } =  await (this.hass.callApi("GET", "states/valve.settings"));
    console.log(attributes)
    return JSON.parse(attributes || 'null') || new Map<string, Settings>()
  }

  private saveSettings(settings: Settings): Promise<boolean> {
    console.log('saving schedule')
    return this.hass.callApi("POST", "states/valve.settings", {
        "state": "saved",
        "attributes": {
          [settings.name]: `${JSON.stringify(settings)}`
        }
    })
  }

  private deleteSettings(): Promise<boolean> {
    console.log('deleting schedule')
    return this.hass.callApi("POST", "states/valve.settings", {
        "state": "empty",
        "attributes": undefined
    })
  }

  private handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
    }
  }

  private showSuccessToast(message: string): void {
    const element = this.shadowRoot?.querySelector('ha-card') as HTMLElement;
    if (element) {
      this.toasts.push(
        html`
          <sp-toast open variant="positive">${message}</sp-toast>
        `,
      );
      render(this.toasts, element);
    }
  }

  private showWarning(warning: string): TemplateResult {
    return html`<hui-warning>${warning}</hui-warning> `;
  }

  private showError(error: string): TemplateResult {
    const errorCard = document.createElement("hui-error-card");
    errorCard.setConfig({
      type: "error",
      error,
      origConfig: this.config,
    });

    return html` ${errorCard} `;
  }
}
