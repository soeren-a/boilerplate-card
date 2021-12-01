/* eslint-disable @typescript-eslint/camelcase */

import { html, css, LitElement, TemplateResult } from 'lit';
import { customElement, queryAll } from 'lit/decorators.js';

import '@spectrum-web-components/button/sp-button.js';
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

export interface Settings {
  payload: WeeklySchedule;
  name: string;
}

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
  weekly_schedule: {
    [K in ScheduleIndex]: ValveTiming;
  };
}

@customElement('valve-settings')
export class ValveSettings extends LitElement {
  static styles = css`
    sp-tab-panel {
      margin-left: var(--spectrum-global-dimension-size-400);
      height: 100%;
      width: 100%;
    }

    sp-divider {
      margin-top: var(--spectrum-global-dimension-size-125);
    }

    sp-slider {
      margin-left: var(--spectrum-global-dimension-size-250);
      width: var(--spectrum-global-dimension-size-1800);
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
      margin-left: var(--spectrum-global-dimension-size-125);

      display: flex;
      flex-direction: column;
    }

    .entry {
      display: flex;
      align-items: center;
      gap: var(--spectrum-global-dimension-size-125);
    }

    .button {
      margin: var(--spectrum-global-dimension-size-250) var(--spectrum-global-dimension-size-125);
      display: flex;
      justify-content: flex-end;
    }
  `;

  @queryAll('sp-tab-panel')
  private tabs!: TabPanel[];

  private restoredSettings?: Map<string, WeeklySchedule>;

  private renderWeekSchedule(valveId: string): TemplateResult[] {
    const itemTemplates: TemplateResult[] = [];
    const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    weekdays.forEach((day, index) => {
      const restore = this.getSetting(valveId);
      const daySchedule: ValveTiming = restore && restore.weekly_schedule[(index + 1).toString()];
      const transitionList = daySchedule?.transitions || [];

      itemTemplates.push(
        html`
          <div>
            <h4 class="spectrum-Heading--subtitle1">${day}</h4>
            <div class="values">
              ${[...Array(transitionList?.length || 4).keys()].map(i => {
                return html`
                  <div class="entry">
                    <sp-number-field
                      min="0"
                      max="23"
                      value=${Math.floor(transitionList[i]?.transitionTime / 60) || [6, 12, 18, 23][i]}
                    ></sp-number-field>
                    :
                    <sp-number-field
                      min="0"
                      max="59"
                      value=${transitionList[i]?.transitionTime % 60 || 0}
                      format-options='{ "minimumIntegerDigits": 2 }'
                    ></sp-number-field>
                    <sp-slider
                      label="Temperatur"
                      variant="ramp"
                      value=${transitionList[i]?.heatSetpoint || '20'}
                      min="15"
                      max="30"
                      format-options='{"style": "unit","unit": "degree","unitDisplay": "narrow"}'
                    ></sp-slider>
                  </div>
                `;
              })}
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
          <sp-tab label="Arbeitszimmer" value="thermostat_homeoffice"></sp-tab>
          <sp-tab label="Kinderzimmer" value="thermostat_children_room"></sp-tab>
          <sp-tab label="Bad" value="thermostat_bath"></sp-tab>
          <sp-tab-panel value="thermostat_livingroom_1"
            ><div class="week">${this.renderWeekSchedule('thermostat_livingroom_1')}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_livingroom_2"
            ><div class="week">${this.renderWeekSchedule('thermostat_livingroom_2')}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_kitchen"
            ><div class="week">${this.renderWeekSchedule('thermostat_kitchen')}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_homeoffice"
            ><div class="week">${this.renderWeekSchedule('thermostat_homeoffice')}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_children_room"
            ><div class="week">${this.renderWeekSchedule('thermostat_children_room')}</div></sp-tab-panel
          >
          <sp-tab-panel value="thermostat_bath"
            ><div class="week">${this.renderWeekSchedule('thermostat_bath')}</div></sp-tab-panel
          >
        </sp-tabs>
        <div class="button">
          <sp-button
            size="m"
            @click=${(): void => {
              this.updateValveSettings();
            }}
            >Änderungen speichern</sp-button
          >
        </div>
      </div>
    `;
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

        const eventPayload: Settings = {
          payload: valveSettings,
          name: valveMQTTName,
        };

        const event = new CustomEvent('saved', {
          detail: {
            message: JSON.stringify(eventPayload),
          },
        });
        this.dispatchEvent(event);

        localStorage.setItem(valveMQTTName, JSON.stringify(valveSettings));
      }
    });
  }

  private getSetting(id: string): WeeklySchedule | undefined {
    return JSON.parse(localStorage.getItem(id) || 'null') || undefined;
  }

  protected render(): TemplateResult {
    return html`
      <div class="main">${this.renderSettingsContent()}</div>
    `;
  }
}
