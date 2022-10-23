import { html, css, LitElement, TemplateResult, nothing, PropertyValues } from 'lit';
import { customElement, property, query, queryAll } from 'lit/decorators.js';

import '@material/mwc-tab-bar';
import '@material/mwc-tab';
import '@material/mwc-switch';
import '@material/mwc-slider';
import '@material/mwc-textfield';
import '@material/mwc-fab';
import '@material/mwc-icon';

import { Tab } from '@material/mwc-tab/mwc-tab.js';
import { TabBar } from '@material/mwc-tab-bar/mwc-tab-bar.js';
import { Switch } from '@material/mwc-switch/mwc-switch.js';
import { Slider } from '@material/mwc-slider/slider.js';
import { FormfieldBase } from '@material/mwc-formfield/mwc-formfield-base.js';
import { TextField } from '@material/mwc-textfield/mwc-textfield.js';

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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export class ValveSettings extends LitElement {
  static styles = css`
    .content {
      margin-left: 12px;
      margin-right: 12px;
      height: 100%;
    }

    .weekswitch {
      height: 36px;
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
      margin: 20px 16px;
      display: flex;
      justify-content: flex-end;
    }

    mwc-slider {
      width: 210px;
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
    if (!valveId) return [];

    const itemTemplates: TemplateResult[] = [];
    const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    weekdays.forEach((day, index) => {
      const restore = this.getSetting(valveId);
      const daySchedule: ValveTiming = restore && restore.weekly_schedule[(index + 1).toString()];
      const transitionList = daySchedule?.transitions || [];
      const switchMoToTh = this.shadowRoot?.querySelector('mwc-switch') as Switch;

      if (index === 0 || !switchMoToTh?.selected || (!!switchMoToTh?.selected && index > 3)) {
        itemTemplates.push(
          html`
            <div>
              <h4>${!!switchMoToTh?.selected && index === 0 ? 'Montag - Donnerstag' : day}</h4>
              ${index === 0
                ? html`<div class="weekswitch">
                    <mwc-formfield label="Montag - Donnerstag">
                      <mwc-switch
                        @click=${(): void => {
                          this.requestUpdate();
                        }}
                      ></mwc-switch>
                    </mwc-formfield>
                  </div> `
                : nothing}

              <div class="values">
                ${[...Array(transitionList?.length || 4).keys()].map((i) => {
                  return html`
                    <div class="entry">
                      <mwc-textfield
                        type="time"
                        min="00:00"
                        max="23:59"
                        step="60"
                        value=${this.toHoursAndMinutes(transitionList[i]?.transitionTime || [6, 12, 18, 23][i] * 60)}
                      ></mwc-textfield>

                      <mwc-formfield label=${transitionList[i]?.heatSetpoint || '20'} id="${day}-templabel-${i}">
                        <mwc-slider
                          label="Temperatur"
                          value=${Number(transitionList[i]?.heatSetpoint || '20')}
                          min="16"
                          max="30"
                          @input=${(event: CustomEvent): void => {
                            const e = this.shadowRoot?.getElementById(`${day}-templabel-${i}`) as FormfieldBase;
                            if (e) e.label = event.detail.value;
                          }}
                        ></mwc-slider
                      ></mwc-formfield>
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

  private toHoursAndMinutes(totalMinutes: number): string {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
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
    this.tabs.forEach((tab) => {
      if (tab.active) {
        const times = this.shadowRoot?.querySelectorAll('mwc-textfield') as NodeListOf<TextField>;
        const tempSliders = this.shadowRoot?.querySelectorAll('mwc-slider') as NodeListOf<Slider>;
        const switchMoToTh = this.shadowRoot?.querySelector('mwc-switch') as Switch;
        const valveMQTTName = tab.id;
        const indexAdjustment = switchMoToTh?.selected ? 3 : 0;

        for (let settingIndex = 0; settingIndex < 7; settingIndex += 1) {
          // iterate over the entries
          const transitions: ValveTransition[] = [];
          const numoftrans = 4;
          const startIndexNF = Math.max(settingIndex - indexAdjustment, 0) * numoftrans;
          const startIndexSlider = Math.max(settingIndex - indexAdjustment, 0) * numoftrans;
          for (let i = startIndexNF, j = startIndexSlider; i < startIndexNF + numoftrans; i++, j++) {
            const time = times[i]?.value.split(':');
            const temp = tempSliders[j]?.value;
            transitions.push({ heatSetpoint: temp.toString(), transitionTime: +time[0] * 60 + +time[1] });
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
          <mwc-fab
            extended
            label="Änderungen speichern"
            @click=${(): void => {
              this.updateValveSettings();
            }}
            ><mwc-icon slot="icon">save</mwc-icon></mwc-fab
          >
        </div>
      </div>
    `;
  }

  protected firstUpdated(_changedProperties: PropertyValues): void {
    super.firstUpdated(_changedProperties);

    this.tabBar.addEventListener('MDCTabBar:activated', (e) => {
      const { index } = (e as CustomEvent).detail;
      this.valveIndex = index;
    });
  }
}
