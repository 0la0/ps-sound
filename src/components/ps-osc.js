import PsBase from './ps-base';
import UgenConnectinType from 'services/UgenConnection/UgenConnectionType';
import UgenConnection from 'services/UgenConnection/UgenConnection';
import ContinuousOscillator from 'services/audio/ContinuousOscillator';
import { InputType, } from 'services/AudioParameter/SignalParameter';
import { batchRender, } from 'services/TaskScheduler';
import ContinuousParam from '../util/ContinuousParam';
import metronome, { MetronomeScheduler } from '../services/metronome';

export default class PsEnvOsc extends PsBase {
  static get tag() {
    return 'ps-osc';
  }

  static get observedAttributes() {
    return [ 'wav', 'frequency', 'modulator' ];
  }

  connectedCallback() {
    super.connectedCallback();
    console.log('ps-osc connected');

    const waveform = this.getAttribute('wav');
    this.osc = new ContinuousOscillator(440, waveform);
    this.audioModel = new UgenConnection('CONTINUOUS_OSC', this.osc, UgenConnectinType.EMPTY, UgenConnectinType.SIGNAL);
    
    this.paramMap = {
      frequency: new ContinuousParam({
        attrName: 'frequency',
        param: this.osc.getFrequencyParam(),
        inputType: new InputType().numeric().message().signal(),
        defaultValue: 440,
        element: this,
      }),
      wav: {
        setValue: val => console.log('TODO: set waveform', val),
        disconnect: () => {},
      },
      modulator: new ContinuousParam({
        attrName: 'modulator',
        param: this.osc.getFrequencyParam(),
        inputType: new InputType().signal(),
        defaultValue: 440,
        element: this,
      }),
    };

    this.metronomeSchedulable = new MetronomeScheduler({
      start: () => {
        this.osc.startAtTime();
        console.log('starting')
      },
      stop: () => this.osc.stop(),
    });
    metronome.register(this.metronomeSchedulable);
    if (metronome.isRunning()) {
      this.osc.startAtTime();
    }
    batchRender(() => {
      if (this.parentNode.audioModel) {
        this.audioModel.connectTo(this.parentNode.audioModel);
      }
    });
  }

  disconnectedCallback() {
    console.log('ps-osc disconnected');
    Object.keys(this.paramMap).forEach(key => this.paramMap[key].disconnect());
    this.audioModel.disconnect();
    metronome.deregister(this.metronomeSchedulable);
  }

  attributeChangedCallback(attrName, oldVal, newVal) {
    if (!this.isMounted) { return; }
    const param = this.paramMap[attrName];
    if (!param) {
      throw new Error(`Observed attribute not mapped ${attrName}`);
    }
    param.setValue(newVal);
  }
}
