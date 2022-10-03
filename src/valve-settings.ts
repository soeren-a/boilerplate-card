/* eslint-disable @typescript-eslint/camelcase */

import { html, css, LitElement, TemplateResult, nothing, PropertyValues } from 'lit';
import { customElement, property, query, queryAll } from 'lit/decorators.js';

import '@spectrum-web-components/number-field/sp-number-field.js';
import '@spectrum-web-components/divider/sp-divider.js';
import '@spectrum-web-components/slider/sp-slider.js';

import { Tab } from '@material/mwc-tab/mwc-tab.js';
import { TabBar } from '@material/mwc-tab-bar/mwc-tab-bar.js';
import { Switch } from '@material/mwc-switch/mwc-switch.js';

type ScheduleIndex = '1' | '2' | '3' | '4' | '5' | '6' | '7';
type DayOfWeekIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const MondayToSundayIndex: DayOfWeekIndex[] = [6, 7, 1, 2, 3, 4, 5];

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
    sp-divider {
      margin-top: var(--spectrum-global-dimension-size-125);
    }

    sp-slider {
      margin-left: var(--spectrum-global-dimension-size-250);
      width: var(--spectrum-global-dimension-size-1800);
    }

    .content {
      margin-left: 12px;
      margin-right: 12px;
      height: 100%;
    }

    .schedule {
      display: flex;
      flex-direction: column;
      width: 100%;
      margin-left: 12px;
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

  @queryAll('mwc-tab')
  private tabs!: Tab[];

  @query('mwc-tab-bar')
  private tabBar!: TabBar;

  @property({ type: Object, attribute: false })
  private settings?: Record<string, Settings>;

  @property({ type: Number, attribute: false })
  private valveIndex = -1;

  private renderValveWeekSchedule(): TemplateResult[] {
    if (this.valveIndex < 0) return [];

    const valveId = this.tabs[this.valveIndex]?.id;
    console.log(`${this.valveIndex}, ${valveId}`);
    if (!valveId) return [];

    const itemTemplates: TemplateResult[] = [];
    const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    weekdays.forEach((day, index) => {
      const restore = this.getSetting(valveId);
      const daySchedule: ValveTiming = restore && restore.weekly_schedule[(index + 1).toString()];
      const transitionList = daySchedule?.transitions || [];
      const switchMoToTh = this.querySelector('mwc-switch') as Switch;

      if (index === 0 || !switchMoToTh?.selected || (!!switchMoToTh?.selected && index > 3)) {
        itemTemplates.push(
          html`
            <div>
              <h4 class="spectrum-Heading--subtitle1">
                ${!!switchMoToTh?.selected && index === 0 ? 'Montag - Donnerstag' : day}
              </h4>
              ${index === 0
                ? html`
                    <mwc-formfield label="Montag - Donnerstag">
                      <mwc-switch
                        @click=${(event): void => {
                          event.target.selected = !event.target.selected;
                          console.log(event.target.selected);
                          this.requestUpdate();
                        }}
                      ></mwc-switch>
                    </mwc-formfield>
                  `
                : nothing}

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
      }
    });
    return itemTemplates;
  }

  private renderTabBar(): TemplateResult {
    return html`
      <mwc-tab-bar>
        <mwc-tab label="Wohnzimmer Terrasse" id="thermostat_livingroom_1"> </mwc-tab>
        <mwc-tab label="Wohnzimmer Esstisch" id="thermostat_livingroom_2"> </mwc-tab>
        <mwc-tab label="Küche" id="thermostat_kitchen"> </mwc-tab>
        <mwc-tab label="Arbeitszimmer" id="thermostat_homeoffice"> </mwc-tab>
        <mwc-tab label="Kinderzimmer" id="thermostat_children_room"> </mwc-tab>
        <mwc-tab label="Bad" id="thermostat_bath"> </mwc-tab>
      </mwc-tab-bar>
    `;
  }

  private updateValveSettings(): void {
    const valveSettings: WeeklySchedule = { weekly_schedule: {} } as WeeklySchedule;
    this.tabs.forEach(tab => {
      if (tab.active) {
        const times = tab.querySelectorAll('sp-number-field');
        const tempSliders = tab.querySelectorAll('sp-slider');
        const switchMoToTh = tab.querySelector('mwc-switch') as Switch;
        const valveMQTTName = tab.id;
        const indexAdjustment = switchMoToTh?.selected ? 3 : 0;

        for (let settingIndex = 0; settingIndex < 7; settingIndex += 1) {
          // iterate over the entries
          const transitions: ValveTransition[] = [];
          const numoftrans = 4;
          const elementsCount = numoftrans * 2; // *2 because we have one element for the hour and one for minutes
          const startIndexNF = Math.max(settingIndex - indexAdjustment, 0) * elementsCount;
          const startIndexSlider = Math.max(settingIndex - indexAdjustment, 0) * numoftrans;
          for (let i = startIndexNF, j = startIndexSlider; i < startIndexNF + elementsCount; i += 2, j += 1) {
            const hour = times[i].value;
            const minutes = times[i + 1].value;
            const temp = tempSliders[j].value;
            transitions.push({ heatSetpoint: temp.toString(), transitionTime: hour * 60 + minutes });
          }

          const dayofweek = MondayToSundayIndex[settingIndex];
          valveSettings.weekly_schedule[(settingIndex + 1).toString() as ScheduleIndex] = {
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
      }
    });
  }

  private getSetting(id: string): WeeklySchedule | undefined {
    const setting = this.settings && this.settings[id];
    return setting?.payload;
  }

  protected render(): TemplateResult {
    return html`
      <div class="content">
        <span>${this.renderTabBar()}</span>
        <div class="schedule">${this.renderValveWeekSchedule()}</div>
        <div class="button">
          <mwc-button
            raised
            label="Änderungen speichern"
            @click=${(): void => {
              this.updateValveSettings();
            }}
          ></mwc-button>
        </div>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    this.tabBar.addEventListener('MDCTabBar:activated', e => {
      const { index } = (e as CustomEvent).detail;
      this.valveIndex = index;
    });
  }
}
