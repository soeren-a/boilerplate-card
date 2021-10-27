import { html, css, LitElement, TemplateResult, nothing, render } from 'lit';
import { customElement, property, queryAll, state } from 'lit/decorators.js';
import { HomeAssistant } from 'custom-card-helpers';

import '@spectrum-web-components/button/sp-button.js';
import '@spectrum-web-components/theme/sp-theme.js';
import '@spectrum-web-components/theme/src/themes.js';
import '@spectrum-web-components/toast/sp-toast.js';
import '@spectrum-web-components/sidenav/sp-sidenav.js';
import '@spectrum-web-components/sidenav/sp-sidenav-heading.js';
import '@spectrum-web-components/sidenav/sp-sidenav-item.js';
import '@spectrum-web-components/tabs/sp-tabs.js';
import '@spectrum-web-components/tabs/sp-tab.js';
import '@spectrum-web-components/tabs/sp-tab-panel.js';
import '@spectrum-web-components/number-field/sp-number-field.js';
import '@spectrum-web-components/divider/sp-divider.js';
import '@spectrum-web-components/slider/sp-slider.js';

import { TabPanel } from '@spectrum-web-components/tabs';

type ScheduleIndex = '1' | '2' | '3' | '4' | '5' | '6' | '7';
type DayOfWeekIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7; // starting with Monday

interface ValveTransition {
  heatSetpoint: string; // temperature
  transitionTime: number; // time
}

interface ValveTiming {
  dayofweek: DayOfWeekIndex;
  mode: 1;
  numoftrans: 4;
  transitions: ValveTransition[];
}

interface WeeklySchedule {
  // eslint-disable-next-line camelcase
  weekly_schedule: {
    [K in ScheduleIndex]: ValveTiming;
  };
}

@customElement('valve-settings')
export class ValveSettings extends LitElement {
  static styles = css`
    sp-tab-panel {
      margin-left: 30px;
      height: 100%;
    }

    sp-divider {
      margin-top: 10px;
    }

    sp-slider {
      margin-left: 20px;
      width: 150px;
    }

    sp-toast {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .week {
      display: flex;
      flex-direction: column;
      width: 100%;
    }

    .values {
      margin-left: 10px;

      display: flex;
      flex-direction: column;
    }

    .entry {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .button {
      margin: 20px 10px;
      display: flex;
      justify-content: flex-end;
    }
  `;

  @queryAll('sp-tab-panel')
  private tabs!: TabPanel[];

  private toasts: TemplateResult[] = [];

  @property({ attribute: false }) public hass!: HomeAssistant;

  private renderWeekSchedule(): TemplateResult[] {
    const itemTemplates: TemplateResult[] = [];
    const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    weekdays.forEach(day => {
      itemTemplates.push(
        html`
          <div>
            <h4 class="spectrum-Heading--subtitle1">${day}</h4>
            <div class="values">
              <div class="entry">
                <sp-number-field min="0" max="23" value="6"></sp-number-field>
                :
                <sp-number-field
                  min="0"
                  max="59"
                  value="0"
                  format-options='{ "minimumIntegerDigits": 2 }'
                ></sp-number-field>
                <sp-slider
                  label="Temperatur"
                  variant="ramp"
                  value="20"
                  min="15"
                  max="30"
                  format-options='{"style": "unit","unit": "degree","unitDisplay": "narrow"}'
                ></sp-slider>
              </div>
              <div class="entry">
                <sp-number-field min="0" max="23" value="12"></sp-number-field>
                :
                <sp-number-field
                  min="0"
                  max="59"
                  value="0"
                  format-options='{ "minimumIntegerDigits": 2 }'
                ></sp-number-field>
                <sp-slider
                  label="Temperatur"
                  variant="ramp"
                  value="21"
                  min="15"
                  max="30"
                  format-options='{"style": "unit","unit": "degree","unitDisplay": "narrow"}'
                ></sp-slider>
              </div>
              <div class="entry">
                <sp-number-field min="0" max="23" value="18"></sp-number-field>
                :
                <sp-number-field
                  min="0"
                  max="59"
                  value="0"
                  format-options='{ "minimumIntegerDigits": 2 }'
                ></sp-number-field>
                <sp-slider
                  label="Temperatur"
                  variant="ramp"
                  value="21"
                  min="15"
                  max="30"
                  format-options='{"style": "unit","unit": "degree","unitDisplay": "narrow"}'
                ></sp-slider>
              </div>
              <div class="entry">
                <sp-number-field min="0" max="23" value="23"></sp-number-field>
                :
                <sp-number-field
                  min="0"
                  max="59"
                  value="0"
                  format-options='{ "minimumIntegerDigits": 2 }'
                ></sp-number-field>
                <sp-slider
                  label="Temperatur"
                  variant="ramp"
                  value="16"
                  min="15"
                  max="30"
                  format-options='{"style": "unit","unit": "degree","unitDisplay": "narrow"}'
                ></sp-slider>
              </div>
            </div>
          </div>
          <sp-divider></sp-divider>
        `,
      );
    });
    return itemTemplates;
  }

  private renderSettingsContent(): TemplateResult {
    return html`
      <div id="settings">
        <sp-tabs selected="thermostat_livingroom_1">
          <sp-tab label="Wohnzimmer Terrasse" value="thermostat_livingroom_1"></sp-tab>
          <sp-tab label="Wohnzimmer Esstisch" value="thermostat_livingroom_2"></sp-tab>
          <sp-tab label="Küche" value="thermostat_kitchen"></sp-tab>
          <sp-tab-panel value="thermostat_livingroom_1"
            ><div class="week">${this.renderWeekSchedule()}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_livingroom_2"
            ><div class="week">${this.renderWeekSchedule()}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_kitchen"><div class="week">${this.renderWeekSchedule()}</div></sp-tab-panel>
        </sp-tabs>
        <div class="button">
          <sp-button
            size="m"
            @click=${() => {
              this.updateValveSettings();
            }}
            >Änderungen speichern</sp-button
          >
        </div>
      </div>
    `;
  }

  private showSuccessToast(message: string): void {
    const element = this.shadowRoot?.querySelector('#settings') as HTMLDivElement;
    if (element) {
      this.toasts.push(
        html`
          <sp-toast open variant="positive">${message}</sp-toast>
        `,
      );
      render(this.toasts, element);
    }
  }

  private updateValveSettings(): void {
    const valveSettings: WeeklySchedule = { weekly_schedule: {} } as WeeklySchedule;
    this.tabs.forEach(tab => {
      if (tab.selected) {
        const times = tab.querySelectorAll('sp-number-field');
        const tempSliders = tab.querySelectorAll('sp-slider');
        const valveMQTTName = tab.value;

        for (let settingIndex = 0; settingIndex < 7; settingIndex += 1) {
          // iterate over the entries
          const transitions: ValveTransition[] = [];
          const numoftrans = 4;
          const elementsCount = numoftrans * 2; // *2 because we have one element for the hour and one for minutes
          const startIndexNF = settingIndex * elementsCount;
          const startIndexSlider = settingIndex * numoftrans;
          for (let i = startIndexNF, j = startIndexSlider; i < startIndexNF + elementsCount; i += 2, j += 1) {
            const hour = times[i].value;
            const minutes = times[i + 1].value;
            const temp = tempSliders[j].value;
            transitions.push({ heatSetpoint: temp.toString(), transitionTime: hour * 60 + minutes });
          }

          const dayofweek = (settingIndex + 1) as DayOfWeekIndex;
          valveSettings.weekly_schedule[dayofweek.toString() as ScheduleIndex] = {
            dayofweek,
            mode: 1,
            numoftrans,
            transitions,
          };
        }

        const event = new CustomEvent('saved', {
          detail: {
            message: JSON.stringify({
              payload: valveSettings,
              name: valveMQTTName,
            }),
          },
        });
        this.dispatchEvent(event);
        //this.showSuccessToast('Heizungseinstellung erfolgreich geändert');
      }
    });
  }

  render() {
    return html`
      <div class="main">${this.renderSettingsContent()}</div>
    `;
  }
}
