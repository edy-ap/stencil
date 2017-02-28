import { Config } from './config';
import { GlobalIonic, Patch } from './interfaces';
import { isDef, toCamelCase } from './helpers';
import { init, DomApi, BrowserDomApi, VNode, VNodeData, h } from '../renderer/index';
import { attributesModule } from '../renderer/modules/attributes';
import { classModule } from '../renderer/modules/class';
import { eventListenersModule } from '../renderer/modules/eventlisteners';
import { styleModule } from '../renderer/modules/style';
export { VNode, VNodeData };
declare const global: any;


export class IonElement extends getBaseElement() {
  /** @internal */
  $dom: DomApi;
  /** @internal */
  $config: Config;
  /** @internal */
  $render: Patch;
  /** @internal */
  _vnode: VNode;
  /** @internal */
  _ob: MutationObserver;


  constructor() {
    super();

    const ionic = getIonic();
    this.$dom = ionic.dom;
    this.$config = ionic.config;
  }


  connect(observedAttributes: string[]) {
    const ele = this;

    ele.$dom.setStyle(ele, 'visibility', 'hidden');

    const propValues: any = {};

    observedAttributes.forEach(attrName => {
      const propName = toCamelCase(attrName);

      propValues[propName] = (<any>ele)[propName];

      Object.defineProperty(ele, propName, {
        get: () => {
          return propValues[propName];
        },
        set: (value: any) => {
          if (propValues[propName] !== value) {
            propValues[propName] = value;
            ele.update();
          }
        }
      });
    });

    ele.update();
  }


  update() {
    console.log('called update');
    const ele = this;

    if (ele._ob) {
      return;
    }

    ele._ob = new MutationObserver(() => {
      patch(ele);

      ele._ob.disconnect();
      ele._ob = null;
    });

    const textNode = ele.$dom.createTextNode('');
    ele._ob.observe(textNode, { characterData: true });
    textNode.data = '1';
  }


  attributeChangedCallback(attrName: string, oldVal: string, newVal: string) {
    console.debug(`attributeChangedCallback: ${attrName}, was "${oldVal}", now "${newVal}"`);

    (<any>this)[toCamelCase(attrName)] = newVal;
  }


  disconnectedCallback() {
    this.$dom = this.$config = this.$render = this._vnode = this._ob = null;
  }

  ionNode(h: any): VNode { h; return null; };

}


function patch(ele: IonElement) {
  const newVnode = ele.ionNode(h);
  if (!newVnode) {
    return;
  }

  const config = ele.$config;
  const dom = ele.$dom;

  const mode = getValue('mode', config, dom, ele);
  const color = getValue('color', config, dom, ele);

  let componentName = dom.tagName(ele).toLowerCase();
  if (componentName.indexOf('ion-') === 0) {
    componentName = componentName.substring(4);
  }

  const dataClass = newVnode.data.class = newVnode.data.class || {};
  dataClass[componentName] = true;

  dataClass[`${componentName}-${mode}`] = true;
  if (color) {
    dataClass[`${componentName}-${mode}-${color}`] = true;
  }

  if (!ele.$render) {
    ele.$render = init([
      attributesModule,
      classModule,
      eventListenersModule,
      styleModule
    ], dom);

    ele._vnode = ele.$render(ele, newVnode);

    dom.setStyle(ele, 'visibility', '');

  } else {
    ele._vnode = ele.$render(ele._vnode, newVnode);
  }
}


function getValue(name: string, config: Config, domApi: DomApi, ele: HTMLElement, fallback: any = null): any {
  const val = domApi.getPropOrAttr(ele, name);
  return isDef(val) ? val : config.get(name, fallback);
}


function getIonic(): GlobalIonic {
  const GLOBAL = typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : Function('return this;')();
  const ionic: GlobalIonic  = (GLOBAL.ionic = GLOBAL.ionic || {});

  if (!ionic.dom) {
    ionic.dom = new BrowserDomApi(document);
  }

  if (!ionic.config) {
    ionic.config = new Config();
  }

  return ionic;
}


function getBaseElement(): { new(): HTMLElement } {
  if (typeof HTMLElement !== 'function') {
    const BaseElement = function(){};
    BaseElement.prototype = getIonic().dom.createElement('div');
    return <any>BaseElement;
  }

  return HTMLElement;
}