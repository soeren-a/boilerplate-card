/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  LitElement,
  html,
  TemplateResult,
  css,
  PropertyValues,
  CSSResultGroup,
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

import "@spectrum-web-components/button/sp-button.js";
import "@spectrum-web-components/theme/sp-theme.js";
import "@spectrum-web-components/theme/src/themes.js";
import "@spectrum-web-components/toast/sp-toast.js";
import "@spectrum-web-components/sidenav/sp-sidenav.js";
import "@spectrum-web-components/sidenav/sp-sidenav-heading.js";
import "@spectrum-web-components/sidenav/sp-sidenav-item.js";
import '@spectrum-web-components/tabs/sp-tabs.js';
import '@spectrum-web-components/tabs/sp-tab.js';
import '@spectrum-web-components/tabs/sp-tab-panel.js';
import '@spectrum-web-components/number-field/sp-number-field.js';
import '@spectrum-web-components/divider/sp-divider.js';
import '@spectrum-web-components/toast/sp-toast.js';
import { NumberField } from '@spectrum-web-components/number-field';
import './valve-settings'
import "./editor";

import type { SettingsCardConfig } from "./types";
import { actionHandler } from "./action-handler-directive";
import { localize } from "./localize/localize";
import { SettingsChangeEvent } from "./valve-settings";

/* eslint no-console: 0 */

// This puts your card into the UI card picker dialog
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "settings-card",
  name: "Settings Card",
  description: "A template custom card for you to create something awesome",
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
    `;
  }

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
      name: "Settings",
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
          <valve-settings @saved=${(event: CustomEvent) => {
            const valveSettings = JSON.parse(event.detail.message) as SettingsChangeEvent

            this.hass.callService('mqtt', 'publish', {
              topic: `zigbee2mqtt/${valveSettings.name}/set`,
              payload: `${JSON.stringify(valveSettings.payload)}`,
              retain: true
            }).then(() => {
              console.log(`Service successfully called [domain: mqtt, service: publish, topic: zigbee2mqtt/${valveSettings.name}/set]`)
            })
          }}></valve-settings>
        </ha-card>
      </sp-theme>
    `;
  }

  private handleAction(ev: ActionHandlerEvent): void {
    if (this.hass && this.config && ev.detail.action) {
      handleAction(this, this.hass, this.config, ev.detail.action);
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
